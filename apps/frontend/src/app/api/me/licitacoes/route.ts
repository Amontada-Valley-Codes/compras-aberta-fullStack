import { NextResponse } from "next/server";
import type { MePncpBid } from "@/features/dashboard/me/cnae-match";

const PNCP_BASE_URL = "https://pncp.gov.br/api/consulta";
const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

interface RawPncpItem {
  numeroControlePNCP: string;
  numeroCompra: string;
  processo: string | null;
  anoCompra: number;
  sequencialCompra: number;
  objetoCompra: string | null;
  informacaoComplementar: string | null;
  modalidadeId: number;
  modalidadeNome: string;
  modoDisputaNome?: string | null;
  tipoInstrumentoConvocatorioNome?: string | null;
  amparoLegal?: { nome?: string; descricao?: string } | null;
  srp: boolean;
  situacaoCompraNome: string;
  valorTotalEstimado: number | null;
  valorTotalHomologado: number | null;
  dataPublicacaoPncp: string | null;
  dataAtualizacao?: string | null;
  dataAberturaProposta: string | null;
  dataEncerramentoProposta: string | null;
  linkSistemaOrigem?: string | null;
  linkProcessoEletronico?: string | null;
  usuarioNome?: string | null;
  orgaoEntidade: {
    cnpj: string;
    razaoSocial: string;
    esferaId?: string | null;
    poderId?: string | null;
  };
  unidadeOrgao?: {
    ufNome?: string;
    ufSigla?: string;
    municipioNome?: string;
    nomeUnidade?: string;
    codigoIbge?: string | number | null;
  } | null;
}

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

function detectSystemName(
  linkSistemaOrigem?: string | null,
  usuarioNome?: string | null,
): string | null {
  if (linkSistemaOrigem) {
    try {
      const host = new URL(linkSistemaOrigem).hostname.toLowerCase();
      if (host.includes("comprasnet") || host.includes("compras.gov.br")) {
        return "Compras.gov.br (Gov.br)";
      }
      if (host.includes("bll")) return "BLL Compras";
      if (host.includes("licitacoes-e")) return "Licitações-e (Banco do Brasil)";
      if (host.includes("portaldecompraspublicas")) {
        return "Portal de Compras Públicas";
      }
      if (host.includes("m2atecnologia") || host.includes("m2a")) {
        return "Portal M2A Tecnologia";
      }
      if (host.includes("bbmnet")) return "BBMNET Licitações";
      if (host.includes("licitanet")) return "Licitanet";
      if (host.includes("fortaleza.ce.gov.br")) {
        return "Portal de Compras de Fortaleza";
      }
      return host.replace(/^www\./, "");
    } catch {
      // ignora URL malformada
    }
  }
  if (usuarioNome && usuarioNome.trim()) {
    return usuarioNome.trim();
  }
  return null;
}

function mapRawToBid(raw: RawPncpItem, nowMs: number): MePncpBid {
  const closingMs = raw.dataEncerramentoProposta
    ? new Date(raw.dataEncerramentoProposta).getTime()
    : null;

  const situationLower = (raw.situacaoCompraNome ?? "").toLowerCase();
  const isInactiveSituation =
    situationLower.includes("suspens") ||
    situationLower.includes("revogad") ||
    situationLower.includes("anulad") ||
    situationLower.includes("cancelad") ||
    situationLower.includes("encerrad") ||
    situationLower.includes("fracassad") ||
    situationLower.includes("desert");

  const isOpen =
    !isInactiveSituation && closingMs !== null && !Number.isNaN(closingMs)
      ? closingMs >= nowMs
      : false;

  let daysLeft: number | null = null;
  if (closingMs !== null && !Number.isNaN(closingMs)) {
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
  }

  const cleanUrl = (u?: string | null) => {
    if (!u || typeof u !== "string") return null;
    const trimmed = u.trim();
    if (!trimmed || /\s/.test(trimmed) || !trimmed.includes(".")) return null;
    const candidate = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    try {
      const parsed = new URL(candidate);
      if (!parsed.hostname || !parsed.hostname.includes(".")) return null;
      return parsed.toString();
    } catch {
      return null;
    }
  };

  const disputeUrl = cleanUrl(raw.linkSistemaOrigem);
  const electronicProcessUrl = cleanUrl(raw.linkProcessoEletronico);
  const agencyCnpj = raw.orgaoEntidade?.cnpj ?? "";
  const agencyName = raw.orgaoEntidade?.razaoSocial ?? "Órgão público";

  return {
    id: raw.numeroControlePNCP,
    purchaseNumber: raw.numeroCompra || `${raw.sequencialCompra}/${raw.anoCompra}`,
    process: raw.processo ?? null,
    year: raw.anoCompra,
    sequential: raw.sequencialCompra,
    object: (raw.objetoCompra ?? "Objeto não informado").trim(),
    complementaryInfo: raw.informacaoComplementar?.trim() || null,
    modalityId: raw.modalidadeId,
    modality: raw.modalidadeNome || "Licitação",
    disputeMode: raw.modoDisputaNome ?? null,
    instrumentType: raw.tipoInstrumentoConvocatorioNome ?? null,
    legalBasis: raw.amparoLegal?.nome?.trim() ?? null,
    legalBasisDescription: raw.amparoLegal?.descricao?.trim() ?? null,
    srp: Boolean(raw.srp),
    situation: raw.situacaoCompraNome || "Divulgada no PNCP",
    agencyCnpj,
    agencyName,
    unitName: raw.unidadeOrgao?.nomeUnidade?.trim() || agencyName,
    city: raw.unidadeOrgao?.municipioNome?.trim() || "Ceará",
    uf: raw.unidadeOrgao?.ufSigla?.trim() || "CE",
    ibgeCode:
      raw.unidadeOrgao?.codigoIbge != null
        ? String(raw.unidadeOrgao.codigoIbge)
        : null,
    estimatedValue: raw.valorTotalEstimado ?? null,
    awardedValue: raw.valorTotalHomologado ?? null,
    publishedAt: raw.dataPublicacaoPncp ?? null,
    updatedAt: raw.dataAtualizacao ?? null,
    openingAt: raw.dataAberturaProposta ?? null,
    closingAt: raw.dataEncerramentoProposta ?? null,
    isOpen,
    daysLeft,
    disputeUrl,
    electronicProcessUrl,
    pncpGovUrl: `https://pncp.gov.br/app/editais/${agencyCnpj}/${raw.anoCompra}/${raw.sequencialCompra}`,
    systemName: detectSystemName(disputeUrl, raw.usuarioNome),
  };
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
