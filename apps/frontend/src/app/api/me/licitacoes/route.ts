import { NextResponse } from "next/server";
import type { MePncpBid } from "@/features/dashboard/me/cnae-match";
import {
  mapRawToBid,
  type RawPncpItem,
} from "@/features/dashboard/me/pncp-mapper";

const PNCP_BASE_URL = "https://pncp.gov.br/api/consulta";
const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

interface PncpPageResponse {
  data?: RawPncpItem[];
  totalPaginas?: number;
  totalRegistros?: number;
}

const memoryCache = new Map<
  string,
  { timestamp: number; data: { bids: MePncpBid[]; updatedAt: string } }
>();

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

async function fetchPncpPage(path: string, timeoutMs = 22_000): Promise<RawPncpItem[]> {
  try {
    const res = await fetch(`${PNCP_BASE_URL}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok || res.status === 204) return [];
    const json = (await res.json()) as PncpPageResponse;
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ibge = searchParams.get("ibge")?.trim() || "";
  const cacheKey = `pncp-me:${ibge || "CE"}`;

  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  const now = new Date();
  const nowMs = now.getTime();

  // 1. Consulta licitações com propostas abertas no Ceará (ou no município)
  const futureLimit = new Date(nowMs + 365 * DAY_MS);
  const locationFilter = ibge
    ? `codigoMunicipioIbge=${encodeURIComponent(ibge)}`
    : "uf=CE";

  const openPath1 = `/v1/contratacoes/proposta?dataFinal=${ymd(futureLimit)}&${locationFilter}&pagina=1&tamanhoPagina=50`;
  const openPath2 = `/v1/contratacoes/proposta?dataFinal=${ymd(futureLimit)}&${locationFilter}&pagina=2&tamanhoPagina=50`;

  // 2. Consulta licitações publicadas recentemente (inclui vencidas/encerradas)
  // Modalidade 6 = Pregão Eletrônico, Modalidade 8 = Dispensa
  const pastStart = new Date(nowMs - 45 * DAY_MS);
  const pubRange = `dataInicial=${ymd(pastStart)}&dataFinal=${ymd(now)}&${locationFilter}&pagina=1&tamanhoPagina=50`;
  const pubPregaoPath = `/v1/contratacoes/publicacao?${pubRange}&codigoModalidadeContratacao=6`;
  const pubDispensaPath = `/v1/contratacoes/publicacao?${pubRange}&codigoModalidadeContratacao=8`;

  const [openPage1, openPage2, pubPregao, pubDispensa] = await Promise.all([
    fetchPncpPage(openPath1),
    fetchPncpPage(openPath2),
    fetchPncpPage(pubPregaoPath),
    fetchPncpPage(pubDispensaPath),
  ]);

  const seen = new Set<string>();
  const bids: MePncpBid[] = [];

  for (const raw of [...openPage1, ...openPage2, ...pubPregao, ...pubDispensa]) {
    if (!raw?.numeroControlePNCP || seen.has(raw.numeroControlePNCP)) continue;
    seen.add(raw.numeroControlePNCP);
    bids.push(mapRawToBid(raw, nowMs));
  }

  // Ordena: abertas que vencem primeiro no topo, seguidas pelas vencidas mais recentes
  bids.sort((a, b) => {
    if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
    if (a.isOpen) {
      return (a.closingAt ?? "9999").localeCompare(b.closingAt ?? "9999");
    }
    return (b.closingAt ?? b.publishedAt ?? "").localeCompare(
      a.closingAt ?? a.publishedAt ?? "",
    );
  });

  const payload = {
    bids,
    updatedAt: new Date().toISOString(),
  };

  if (bids.length > 0) {
    memoryCache.set(cacheKey, { timestamp: Date.now(), data: payload });
  }

  return NextResponse.json(payload);
}
