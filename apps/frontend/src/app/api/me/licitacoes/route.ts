import { NextResponse } from "next/server";
import {
  evaluateBidMatch,
  evaluateRadarFilter,
  normalizeText,
  type CompanyMatchProfile,
  type EnrichedMeBid,
  type MeOpenBidsResponse,
  type MePaginatedBidsRequest,
  type MePaginatedBidsResponse,
  type MePncpBid,
  type MePncpSyncMeta,
} from "@/features/dashboard/me/cnae-match";
import {
  KNOWN_PORTAL_NAMES,
  mapRawToBid,
  parsePncpControlNumber,
  type RawPncpItem,
} from "@/features/dashboard/me/pncp-mapper";
import {
  BRAZIL_STATES,
  RADAR_SPHERES,
} from "@/features/dashboard/me/radar-types";
import {
  fetchPncpJson,
  isPncpRateLimited,
} from "@/features/dashboard/me/pncp-limiter";
import {
  readOpenBidsDiskCache,
  writeOpenBidsDiskCache,
  type CachedEntry,
} from "@/features/dashboard/me/pncp-disk-cache";

const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_FRESH_MS = 20 * 60 * 1000; // 20 minutos (completamente fresco, sem sync)
const CACHE_STALE_MS = 24 * 60 * 60 * 1000; // 24 horas (stale-while-revalidate imediato)
const CLOSED_FAV_TTL_MS = 60 * 60 * 1000; // 1 hora
const GEO_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
const PNCP_PAGE_SIZE = 50;
const MAX_INITIAL_PAGES = 3; // Até 150 editais carregados na resposta imediata (em ~1.2s)
const MAX_BACKGROUND_PAGES = 30; // Até 1.500 editais carregados em segundo plano
const BACKGROUND_PAGE_INTERVAL_MS = 300; // 300ms de espaçamento entre páginas para evitar 429

interface PncpPageResponse {
  data?: RawPncpItem[];
  totalPaginas?: number;
  totalRegistros?: number;
}

interface PageFetchResult {
  ok: boolean;
  data: RawPncpItem[];
  totalPaginas: number;
  totalRegistros: number;
}

interface MunicipalityCoord {
  ibge: string;
  name: string;
  normName: string;
  lat: number;
  lon: number;
}

interface StateGeoIndex {
  timestamp: number;
  byIbge: Map<string, MunicipalityCoord>;
  byNormName: Map<string, MunicipalityCoord>;
  allCities: string[];
}

const memoryCache = new Map<string, CachedEntry>();
const inFlightInitialLoads = new Map<string, Promise<CachedEntry>>();
const inFlightBackgroundSyncs = new Set<string>();
const closedFavoriteCache = new Map<
  string,
  { timestamp: number; bid: MePncpBid | null }
>();
const stateGeoCache = new Map<string, StateGeoIndex>();

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function sanitizeUf(raw?: string | null): string {
  const clean = (raw ?? "").trim().toUpperCase();
  return BRAZIL_STATES.some((s) => s.uf === clean) ? clean : "CE";
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function getStateGeoIndex(uf: string): Promise<StateGeoIndex | null> {
  const validUf = sanitizeUf(uf);
  const cached = stateGeoCache.get(validUf);
  if (cached && Date.now() - cached.timestamp < GEO_TTL_MS) {
    return cached;
  }

  const stateDef = BRAZIL_STATES.find((s) => s.uf === validUf);
  if (!stateDef) return null;

  try {
    const [metaRes, citiesRes] = await Promise.all([
      fetch(
        `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${stateDef.ibgeCode}/metadados?intrarregiao=municipio`,
        { signal: AbortSignal.timeout(10_000) },
      ),
      fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${validUf}/municipios`,
        { signal: AbortSignal.timeout(10_000) },
      ),
    ]);

    if (!metaRes.ok || !citiesRes.ok) return null;

    const metaJson = (await metaRes.json()) as Array<{
      id?: string | number;
      centroide?: { longitude?: number; latitude?: number };
    }>;
    const citiesJson = (await citiesRes.json()) as Array<{
      id: number;
      nome: string;
    }>;

    const nameByIbge = new Map<string, string>();
    for (const c of citiesJson) {
      if (c?.id && c?.nome) {
        nameByIbge.set(String(c.id), c.nome.trim());
      }
    }

    const byIbge = new Map<string, MunicipalityCoord>();
    const byNormName = new Map<string, MunicipalityCoord>();

    for (const entry of Array.isArray(metaJson) ? metaJson : []) {
      const ibge = String(entry?.id ?? "").trim();
      const lon = Number(entry?.centroide?.longitude);
      const lat = Number(entry?.centroide?.latitude);
      if (!ibge || !Number.isFinite(lon) || !Number.isFinite(lat)) continue;

      const name = nameByIbge.get(ibge) ?? ibge;
      const normName = normalizeText(name);

      const coord: MunicipalityCoord = { ibge, name, normName, lat, lon };
      byIbge.set(ibge, coord);
      byNormName.set(normName, coord);
    }

    const allCities = Array.from(nameByIbge.values()).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );

    const index: StateGeoIndex = {
      timestamp: Date.now(),
      byIbge,
      byNormName,
      allCities,
    };
    stateGeoCache.set(validUf, index);
    return index;
  } catch {
    return null;
  }
}

async function fetchPncpProposalPage(
  locationFilter: string,
  futureYmd: string,
  page: number,
  timeoutMs = 12_000,
): Promise<PageFetchResult> {
  const path = `/v1/contratacoes/proposta?dataFinal=${futureYmd}&${locationFilter}&pagina=${page}&tamanhoPagina=${PNCP_PAGE_SIZE}`;
  const res = await fetchPncpJson<PncpPageResponse>(path, { timeoutMs, maxAttempts: 2 });

  if (res.status === 204) {
    return { ok: true, data: [], totalPaginas: 0, totalRegistros: 0 };
  }

  if (!res.ok || !res.data) {
    return { ok: false, data: [], totalPaginas: 0, totalRegistros: 0 };
  }

  const json = res.data;
  const data = Array.isArray(json?.data) ? json.data : [];
  const totalPaginas =
    typeof json?.totalPaginas === "number" && json.totalPaginas >= 0
      ? json.totalPaginas
      : data.length > 0
        ? 1
        : 0;
  const totalRegistros =
    typeof json?.totalRegistros === "number" && json.totalRegistros >= 0
      ? json.totalRegistros
      : data.length;

  return { ok: true, data, totalPaginas, totalRegistros };
}

function refreshBidDeadlineState(bid: MePncpBid, nowMs: number): MePncpBid {
  if (!bid.closingAt) return bid;
  const closingMs = new Date(bid.closingAt).getTime();
  if (Number.isNaN(closingMs)) return bid;

  const isOpen = bid.isOpen && closingMs >= nowMs;
  let daysLeft: number | null = null;
  const diffMs = closingMs - nowMs;
  if (diffMs < 0) {
    daysLeft = -1;
  } else {
    const nowDateBr = new Date(nowMs - 3 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const closeDateBr = new Date(closingMs - 3 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    daysLeft =
      nowDateBr === closeDateBr ? 0 : Math.max(1, Math.ceil(diffMs / DAY_MS));
  }

  if (isOpen === bid.isOpen && daysLeft === bid.daysLeft) {
    return bid;
  }

  return {
    ...bid,
    isOpen,
    daysLeft,
  };
}

function materializeOpenBids(entry: CachedEntry): MeOpenBidsResponse {
  const nowMs = Date.now();
  const bids = entry.rawOpenBids
    .map((bid) => refreshBidDeadlineState(bid, nowMs))
    .filter((bid) => bid.isOpen);

  return {
    bids,
    meta: {
      ...entry.meta,
      totalOpenBids: bids.length,
    },
  };
}

/**
 * Sincroniza em segundo plano as páginas restantes do PNCP de forma gradual e cadenciada,
 * sem travar as requisições da interface do usuário e sem gerar 429.
 */
function triggerBackgroundSync(
  scope: string,
  locationFilter: string,
  futureYmd: string,
  startPage: number,
  totalPages: number,
  totalRecords: number,
  initialBids: MePncpBid[],
) {
  if (inFlightBackgroundSyncs.has(scope)) return;
  inFlightBackgroundSyncs.add(scope);

  (async () => {
    try {
      const maxPages = Math.min(totalPages, MAX_BACKGROUND_PAGES);
      const seen = new Set<string>(initialBids.map((b) => b.id));
      const accumulatedBids = [...initialBids];
      let fetchedPagesCount = startPage - 1;

      for (let p = startPage; p <= maxPages; p += 1) {
        if (isPncpRateLimited()) {
          // Se o PNCP estiver temporariamente em pausa, espera o desbloqueio
          await wait(22_000);
        }

        const pageResult = await fetchPncpProposalPage(locationFilter, futureYmd, p);
        if (pageResult.ok) {
          fetchedPagesCount += 1;
          const nowMs = Date.now();
          for (const raw of pageResult.data) {
            if (!raw?.numeroControlePNCP || seen.has(raw.numeroControlePNCP)) continue;
            seen.add(raw.numeroControlePNCP);
            const mapped = mapRawToBid(raw, nowMs);
            if (mapped.isOpen) {
              accumulatedBids.push(mapped);
            }
          }
        }

        // Salva periodicamente a cada 5 páginas ou na última para disponibilizar dados progressivamente
        if (p % 5 === 0 || p === maxPages) {
          accumulatedBids.sort((a, b) =>
            (a.closingAt ?? "9999").localeCompare(b.closingAt ?? "9999"),
          );
          const updatedEntry: CachedEntry = {
            timestamp: Date.now(),
            rawOpenBids: accumulatedBids,
            meta: {
              scope,
              pncpTotalRecords: totalRecords,
              pncpTotalPages: totalPages,
              pncpFetchedPages: fetchedPagesCount,
              isComplete: fetchedPagesCount >= maxPages || p >= totalPages,
              updatedAt: new Date().toISOString(),
            },
          };
          memoryCache.set(`pncp-me-open:${scope}`, updatedEntry);
          await writeOpenBidsDiskCache(scope, updatedEntry);
        }

        // Espaçamento amigável entre páginas
        await wait(BACKGROUND_PAGE_INTERVAL_MS);
      }
    } catch (err) {
      console.warn(`[PNCP Background Sync] Erro no sync de ${scope}:`, err);
    } finally {
      inFlightBackgroundSyncs.delete(scope);
    }
  })();
}

/**
 * Carrega a primeira fatia de editais de forma rápida (páginas 1 a MAX_INITIAL_PAGES).
 */
async function fetchInitialOpenBids(
  scope: string,
  locationFilter: string,
  futureYmd: string,
): Promise<CachedEntry> {
  const nowMs = Date.now();
  const firstPage = await fetchPncpProposalPage(locationFilter, futureYmd, 1);

  if (!firstPage.ok) {
    throw new Error("Não foi possível consultar as licitações abertas no PNCP neste momento.");
  }

  const pncpTotalPages = firstPage.totalPaginas;
  const pncpTotalRecords = firstPage.totalRegistros;
  const initialPagesToFetch = Math.min(pncpTotalPages, MAX_INITIAL_PAGES);

  const seen = new Set<string>();
  const openBids: MePncpBid[] = [];

  for (const raw of firstPage.data) {
    if (!raw?.numeroControlePNCP || seen.has(raw.numeroControlePNCP)) continue;
    seen.add(raw.numeroControlePNCP);
    const mapped = mapRawToBid(raw, nowMs);
    if (mapped.isOpen) openBids.push(mapped);
  }

  let pagesFetched = 1;

  // Busca páginas 2 e 3 em sequência rápida
  for (let p = 2; p <= initialPagesToFetch; p += 1) {
    await wait(200);
    const nextPage = await fetchPncpProposalPage(locationFilter, futureYmd, p);
    if (nextPage.ok) {
      pagesFetched += 1;
      for (const raw of nextPage.data) {
        if (!raw?.numeroControlePNCP || seen.has(raw.numeroControlePNCP)) continue;
        seen.add(raw.numeroControlePNCP);
        const mapped = mapRawToBid(raw, nowMs);
        if (mapped.isOpen) openBids.push(mapped);
      }
    }
  }

  openBids.sort((a, b) =>
    (a.closingAt ?? "9999").localeCompare(b.closingAt ?? "9999"),
  );

  const isComplete = pagesFetched >= pncpTotalPages || pncpTotalPages <= 1;

  const entry: CachedEntry = {
    timestamp: Date.now(),
    rawOpenBids: openBids,
    meta: {
      scope,
      pncpTotalRecords,
      pncpTotalPages,
      pncpFetchedPages: pagesFetched,
      isComplete,
      updatedAt: new Date().toISOString(),
    },
  };

  // Se houver páginas adicionais, dispara o sincronismo em background sem bloquear o usuário
  if (!isComplete && pagesFetched < pncpTotalPages) {
    triggerBackgroundSync(
      scope,
      locationFilter,
      futureYmd,
      pagesFetched + 1,
      pncpTotalPages,
      pncpTotalRecords,
      openBids,
    );
  }

  return entry;
}

/**
 * Obtém ou carrega os editais abertos com estratégia Stale-While-Revalidate e persistência em disco.
 */
async function getOrLoadOpenBids(
  ibge: string,
  uf = "CE",
  forceRefresh = false,
): Promise<MeOpenBidsResponse> {
  const validUf = sanitizeUf(uf);
  const scope = ibge || validUf;
  const cacheKey = `pncp-me-open:${scope}`;

  const locationFilter = ibge
    ? `codigoMunicipioIbge=${encodeURIComponent(ibge)}`
    : `uf=${encodeURIComponent(validUf)}`;
  const nowMs = Date.now();
  const futureLimit = new Date(nowMs + 365 * DAY_MS);
  const futureYmd = ymd(futureLimit);

  // 1. Verifica cache em memória
  let existing = memoryCache.get(cacheKey);

  // 2. Se não estiver em memória, tenta ler do cache em disco
  if (!existing) {
    const fromDisk = await readOpenBidsDiskCache(scope);
    if (fromDisk) {
      existing = fromDisk;
      memoryCache.set(cacheKey, fromDisk);
    }
  }

  // 3. Se temos dados em cache:
  if (existing) {
    const age = nowMs - existing.timestamp;

    // Se o usuário solicitou refresh explícito via botão
    if (forceRefresh) {
      try {
        const freshInitial = await fetchInitialOpenBids(scope, locationFilter, futureYmd);
        memoryCache.set(cacheKey, freshInitial);
        await writeOpenBidsDiskCache(scope, freshInitial);
        return materializeOpenBids(freshInitial);
      } catch {
        // Se a chamada ao PNCP falhar no refresh forçado, usa os dados que já temos
        return materializeOpenBids(existing);
      }
    }

    // Se o cache for recente (< 20 min), responde imediatamente
    if (age < CACHE_FRESH_MS) {
      return materializeOpenBids(existing);
    }

    // Se o cache for razoavelmente recente (< 24 horas): STALE-WHILE-REVALIDATE!
    // Devolve imediatamente o que temos na memória (< 5ms) e revalida em segundo plano
    if (age < CACHE_STALE_MS) {
      if (!inFlightBackgroundSyncs.has(scope)) {
        triggerBackgroundSync(
          scope,
          locationFilter,
          futureYmd,
          1,
          existing.meta.pncpTotalPages || 1,
          existing.meta.pncpTotalRecords || existing.rawOpenBids.length,
          existing.rawOpenBids,
        );
      }
      return materializeOpenBids(existing);
    }
  }

  // 4. Sem cache ou cache muito antigo (> 24 horas): faz carga inicial rápida
  let pending = inFlightInitialLoads.get(cacheKey);
  if (!pending) {
    pending = fetchInitialOpenBids(scope, locationFilter, futureYmd)
      .then(async (fresh) => {
        memoryCache.set(cacheKey, fresh);
        await writeOpenBidsDiskCache(scope, fresh);
        return fresh;
      })
      .finally(() => {
        inFlightInitialLoads.delete(cacheKey);
      });
    inFlightInitialLoads.set(cacheKey, pending);
  }

  try {
    const loaded = await pending;
    return materializeOpenBids(loaded);
  } catch (err) {
    if (existing) {
      return materializeOpenBids(existing);
    }
    throw err;
  }
}

async function fetchSingleBidByControlId(
  controlId: string,
): Promise<MePncpBid | null> {
  const cached = closedFavoriteCache.get(controlId);
  if (cached && Date.now() - cached.timestamp < CLOSED_FAV_TTL_MS) {
    return cached.bid
      ? refreshBidDeadlineState(cached.bid, Date.now())
      : null;
  }

  const parsed = parsePncpControlNumber(controlId);
  if (!parsed) return null;

  try {
    const path = `/v1/orgaos/${parsed.cnpj}/compras/${parsed.ano}/${parsed.sequencial}`;
    const res = await fetchPncpJson<RawPncpItem>(path, { timeoutMs: 8_000, maxAttempts: 2 });
    if (!res.ok || !res.data) {
      closedFavoriteCache.set(controlId, { timestamp: Date.now(), bid: null });
      return null;
    }
    const raw = res.data;
    const bid = raw ? mapRawToBid(raw, Date.now()) : null;
    closedFavoriteCache.set(controlId, { timestamp: Date.now(), bid });
    return bid;
  } catch {
    return null;
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIdx = 0;

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (nextIdx < items.length) {
        const current = nextIdx++;
        results[current] = await worker(items[current]);
      }
    }),
  );

  return results;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ibge = searchParams.get("ibge")?.trim() || "";
    const uf = sanitizeUf(searchParams.get("uf"));
    const forceRefresh = searchParams.get("refresh") === "1";

    const payload = await getOrLoadOpenBids(ibge, uf, forceRefresh);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao consultar licitações abertas no PNCP.",
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<MePaginatedBidsRequest>;
    const ibge = body.ibge?.trim() || "";
    const radarConfig = body.radarConfig;
    const effectiveUf = sanitizeUf(radarConfig?.uf || body.uf || "CE");
    const pageSize = Math.max(1, Math.min(50, Number(body.pageSize) || 10));
    const requestedPage = Math.max(1, Number(body.page) || 1);
    const query = (body.query ?? "").trim();
    const normQuery = query ? normalizeText(query) : "";
    const city = (
      radarConfig?.locationMode === "state_city"
        ? radarConfig.city
        : body.city ?? ""
    ).trim();
    const modality = (radarConfig?.modality || body.modality || "").trim();
    const onlyCnaeMatch = Boolean(body.onlyCnaeMatch);
    const sortBy = body.sortBy ?? "match";
    const favoritesOnly = Boolean(body.favoritesOnly);
    const favoriteIds = Array.isArray(body.favoriteIds) ? body.favoriteIds : [];
    const hiddenBidIds = Array.isArray(body.hiddenBidIds)
      ? body.hiddenBidIds
      : [];
    const hiddenSet = new Set(hiddenBidIds);
    const onlyHidden = Boolean(body.onlyHidden);
    const companyProfile: CompanyMatchProfile = body.companyProfile ?? {
      cnaes: [],
    };

    const { bids: openBids, meta } = await getOrLoadOpenBids(
      ibge,
      effectiveUf,
      false,
    );

    let sourceBids: MePncpBid[] = openBids;

    if (favoritesOnly) {
      const favSet = new Set(favoriteIds);
      const foundOpen = openBids.filter((b) => favSet.has(b.id));
      const foundIds = new Set(foundOpen.map((b) => b.id));
      const missingIds = favoriteIds
        .filter((id) => !foundIds.has(id))
        .slice(0, 15);

      const resolvedMissing =
        missingIds.length > 0
          ? await mapWithConcurrency(missingIds, 2, fetchSingleBidByControlId)
          : [];

      sourceBids = [
        ...foundOpen,
        ...resolvedMissing.filter((b): b is MePncpBid => b !== null),
      ];
    }

    // Se modo de raio de distância estiver ativo, carrega centróides IBGE da UF
    let geoIndex: StateGeoIndex | null = null;
    let originCoord: MunicipalityCoord | null = null;
    const isRadiusMode =
      !favoritesOnly &&
      radarConfig?.locationMode === "radius" &&
      radarConfig.radiusKm !== null &&
      radarConfig.radiusKm > 0;

    if (isRadiusMode) {
      geoIndex = await getStateGeoIndex(effectiveUf);
      if (geoIndex) {
        const requestedBase = radarConfig?.radiusBaseCity?.trim() || "";
        if (requestedBase) {
          originCoord =
            geoIndex.byNormName.get(normalizeText(requestedBase)) ??
            geoIndex.byIbge.get(requestedBase) ??
            null;
        }
        if (!originCoord && companyProfile.companyIbge) {
          originCoord =
            geoIndex.byIbge.get(String(companyProfile.companyIbge)) ?? null;
        }
        if (!originCoord && companyProfile.companyCity) {
          originCoord =
            geoIndex.byNormName.get(normalizeText(companyProfile.companyCity)) ??
            null;
        }
      }
    }

    const citySet = new Set<string>(geoIndex?.allCities ?? []);
    const modalitySet = new Set<string>();
    const portalSet = new Set<string>(KNOWN_PORTAL_NAMES);

    for (const bid of sourceBids) {
      if (bid.city) citySet.add(bid.city);
      if (bid.modality) modalitySet.add(bid.modality);
      if (bid.portalName) portalSet.add(bid.portalName);
    }

    const cities = Array.from(citySet).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
    const modalities = Array.from(modalitySet).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
    const portals = Array.from(portalSet).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );

    const enriched: EnrichedMeBid[] = [];
    for (const bid of sourceBids) {
      const isBidHidden = hiddenSet.has(bid.id);
      if (onlyHidden && !isBidHidden) continue;
      if (!onlyHidden && !favoritesOnly && isBidHidden) continue;

      if (city && normalizeText(bid.city) !== normalizeText(city)) continue;
      if (modality && normalizeText(bid.modality) !== normalizeText(modality)) {
        continue;
      }

      let distanceKm: number | null = null;
      if (isRadiusMode && geoIndex && originCoord && radarConfig?.radiusKm) {
        const targetCoord =
          (bid.ibgeCode ? geoIndex.byIbge.get(String(bid.ibgeCode)) : null) ??
          geoIndex.byNormName.get(normalizeText(bid.city)) ??
          null;

        if (!targetCoord) continue;
        distanceKm = haversineKm(
          originCoord.lat,
          originCoord.lon,
          targetCoord.lat,
          targetCoord.lon,
        );
        if (distanceKm > radarConfig.radiusKm) continue;
      }

      if (normQuery) {
        const hay = normalizeText(
          `${bid.object} ${bid.purchaseNumber} ${bid.process ?? ""} ${bid.agencyName} ${bid.unitName} ${bid.city} ${bid.modality} ${bid.portalName ?? ""}`,
        );
        if (!hay.includes(normQuery)) continue;
      }

      const evaluated = radarConfig
        ? evaluateRadarFilter(bid, companyProfile, radarConfig)
        : { passes: true, match: evaluateBidMatch(bid, companyProfile) };

      if (!evaluated.passes) continue;
      if (onlyCnaeMatch && !evaluated.match.isMatch) continue;

      enriched.push({
        ...bid,
        match: evaluated.match,
        distanceKm,
      });
    }

    enriched.sort((a, b) => {
      if (favoritesOnly && a.isOpen !== b.isOpen) {
        return a.isOpen ? -1 : 1;
      }
      if (sortBy === "recent") {
        return (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
      }
      if (sortBy === "value") {
        return (b.estimatedValue ?? 0) - (a.estimatedValue ?? 0);
      }
      if (sortBy === "deadline") {
        return (a.closingAt ?? "9999").localeCompare(b.closingAt ?? "9999");
      }
      if (a.match.isMatch !== b.match.isMatch) {
        return a.match.isMatch ? -1 : 1;
      }
      if (b.match.score !== a.match.score) {
        return b.match.score - a.match.score;
      }
      return (a.closingAt ?? "9999").localeCompare(b.closingAt ?? "9999");
    });

    const totalItems = enriched.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(requestedPage, totalPages);
    const firstIndex = (safePage - 1) * pageSize;
    const items = enriched.slice(firstIndex, firstIndex + pageSize);

    const response: MePaginatedBidsResponse = {
      items,
      totalItems,
      totalPages,
      page: safePage,
      pageSize,
      facets: {
        cities,
        modalities,
        portals,
        spheres: RADAR_SPHERES,
      },
      meta,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao paginar licitações abertas do PNCP.",
      },
      { status: 502 },
    );
  }
}
