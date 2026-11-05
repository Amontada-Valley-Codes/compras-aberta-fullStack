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

const PNCP_BASE_URL = "https://pncp.gov.br/api/consulta";
const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos
const CLOSED_FAV_TTL_MS = 30 * 60 * 1000; // 30 minutos
const GEO_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
const PNCP_PAGE_SIZE = 50;
const MAX_SAFE_PAGES = 40; // Até 2.000 editais abertos simultaneamente por UF
const FETCH_CONCURRENCY = 4;
const MAX_ATTEMPTS = 3;

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

interface CachedEntry {
  timestamp: number;
  rawOpenBids: MePncpBid[];
  meta: Omit<MePncpSyncMeta, "totalOpenBids">;
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
const inFlightLoads = new Map<string, Promise<CachedEntry>>();
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
        { signal: AbortSignal.timeout(12_000) },
      ),
      fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${validUf}/municipios`,
        { signal: AbortSignal.timeout(12_000) },
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

async function fetchPncpProposalPage(
  locationFilter: string,
  futureYmd: string,
  page: number,
  timeoutMs = 22_000,
): Promise<PageFetchResult> {
  const path = `/v1/contratacoes/proposta?dataFinal=${futureYmd}&${locationFilter}&pagina=${page}&tamanhoPagina=${PNCP_PAGE_SIZE}`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(`${PNCP_BASE_URL}${path}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.status === 204) {
        return { ok: true, data: [], totalPaginas: 0, totalRegistros: 0 };
      }

      if (res.status === 429) {
        if (attempt < MAX_ATTEMPTS) {
          await wait(3_500 * attempt);
          continue;
        }
        return { ok: false, data: [], totalPaginas: 0, totalRegistros: 0 };
      }

      if (!res.ok) {
        if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
          await wait(1_000 * attempt);
          continue;
        }
        return { ok: false, data: [], totalPaginas: 0, totalRegistros: 0 };
      }

      const json = (await res.json()) as PncpPageResponse;
      const data = Array.isArray(json?.data) ? json.data : [];
      return {
        ok: true,
        data,
        totalPaginas:
          typeof json?.totalPaginas === "number" && json.totalPaginas >= 0
            ? json.totalPaginas
            : data.length > 0
              ? 1
              : 0,
        totalRegistros:
          typeof json?.totalRegistros === "number" && json.totalRegistros >= 0
            ? json.totalRegistros
            : data.length,
      };
    } catch {
      if (attempt < MAX_ATTEMPTS) {
        await wait(1_000 * attempt);
        continue;
      }
      return { ok: false, data: [], totalPaginas: 0, totalRegistros: 0 };
    }
  }

  return { ok: false, data: [], totalPaginas: 0, totalRegistros: 0 };
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

async function fetchAllOpenBidsFromPncp(
  ibge: string,
  uf = "CE",
): Promise<CachedEntry> {
  const now = new Date();
  const nowMs = now.getTime();
  const futureLimit = new Date(nowMs + 365 * DAY_MS);
  const futureYmd = ymd(futureLimit);
  const validUf = sanitizeUf(uf);
  const scope = ibge || validUf;
  const locationFilter = ibge
    ? `codigoMunicipioIbge=${encodeURIComponent(ibge)}`
    : `uf=${encodeURIComponent(validUf)}`;

  const firstPage = await fetchPncpProposalPage(locationFilter, futureYmd, 1);
  if (!firstPage.ok) {
    throw new Error(
      "Não foi possível consultar as licitações abertas no PNCP.",
    );
  }

  const pncpTotalPages = firstPage.totalPaginas;
  const pncpTotalRecords = firstPage.totalRegistros;
  const pagesToFetch = Math.min(pncpTotalPages, MAX_SAFE_PAGES);

  let restPages: PageFetchResult[] = [];
  if (pagesToFetch > 1) {
    const pageNumbers = Array.from(
      { length: pagesToFetch - 1 },
      (_, idx) => idx + 2,
    );
    restPages = await mapWithConcurrency(
      pageNumbers,
      FETCH_CONCURRENCY,
      (pageNum) => fetchPncpProposalPage(locationFilter, futureYmd, pageNum),
    );
  }

  const succeededPagesCount =
    pncpTotalPages === 0
      ? 0
      : 1 + restPages.filter((result) => result.ok).length;

  const isComplete =
    pncpTotalPages === 0 ||
    (succeededPagesCount === pncpTotalPages &&
      pncpTotalPages <= MAX_SAFE_PAGES);

  const seen = new Set<string>();
  const openBids: MePncpBid[] = [];

  for (const pageResult of [firstPage, ...restPages]) {
    if (!pageResult.ok) continue;
    for (const raw of pageResult.data) {
      if (!raw?.numeroControlePNCP || seen.has(raw.numeroControlePNCP)) continue;
      seen.add(raw.numeroControlePNCP);
      const mapped = mapRawToBid(raw, nowMs);
      if (mapped.isOpen) {
        openBids.push(mapped);
      }
    }
  }

  openBids.sort((a, b) =>
    (a.closingAt ?? "9999").localeCompare(b.closingAt ?? "9999"),
  );

  return {
    timestamp: Date.now(),
    rawOpenBids: openBids,
    meta: {
      scope,
      pncpTotalRecords,
      pncpTotalPages,
      pncpFetchedPages: succeededPagesCount,
      isComplete,
      updatedAt: new Date().toISOString(),
    },
  };
}

async function getOrLoadOpenBids(
  ibge: string,
  uf = "CE",
  forceRefresh = false,
): Promise<MeOpenBidsResponse> {
  const validUf = sanitizeUf(uf);
  const cacheKey = `pncp-me-open:${ibge || validUf}`;
  const existing = memoryCache.get(cacheKey);

  if (
    !forceRefresh &&
    existing &&
    Date.now() - existing.timestamp < CACHE_TTL_MS
  ) {
    return materializeOpenBids(existing);
  }

  let pending = inFlightLoads.get(cacheKey);
  if (!pending) {
    pending = fetchAllOpenBidsFromPncp(ibge, validUf)
      .then((fresh) => {
        memoryCache.set(cacheKey, fresh);
        return fresh;
      })
      .finally(() => {
        inFlightLoads.delete(cacheKey);
      });
    inFlightLoads.set(cacheKey, pending);
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
    const res = await fetch(
      `${PNCP_BASE_URL}/v1/orgaos/${parsed.cnpj}/compras/${parsed.ano}/${parsed.sequencial}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      },
    );
    if (!res.ok || res.status === 204) {
      closedFavoriteCache.set(controlId, { timestamp: Date.now(), bid: null });
      return null;
    }
    const raw = (await res.json()) as RawPncpItem;
    const bid = raw ? mapRawToBid(raw, Date.now()) : null;
    closedFavoriteCache.set(controlId, { timestamp: Date.now(), bid });
    return bid;
  } catch {
    return null;
  }
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
        .slice(0, 20);

      const resolvedMissing =
        missingIds.length > 0
          ? await mapWithConcurrency(missingIds, 4, fetchSingleBidByControlId)
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
