import type { MePncpBid } from "./cnae-match";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RawPncpItem {
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
  orcamentoSigilosoCodigo?: number | null;
  orcamentoSigilosoDescricao?: string | null;
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
    codigoUnidade?: string | number | null;
    nomeUnidade?: string;
    codigoIbge?: string | number | null;
  } | null;
}

interface PortalPlatformDef {
  name: string;
  searchUrl: string;
  hostPatterns: RegExp[];
  textPatterns: RegExp[];
}

const KNOWN_BIDDING_PORTALS: PortalPlatformDef[] = [
  {
    name: "Compras.gov.br (Gov.br)",
    searchUrl:
      "https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras",
    hostPatterns: [/compras\.gov\.br/i, /comprasnet/i, /serpro\.gov\.br/i],
    textPatterns: [
      /\bcompras\.gov\.br\b/i,
      /\bcomprasnet\b/i,
      /\bportal de compras do governo federal\b/i,
    ],
  },
  {
    name: "Portal de Compras Públicas (PCP)",
    searchUrl: "https://www.portaldecompraspublicas.com.br/processos",
    hostPatterns: [/portaldecompraspublicas\.com\.br/i],
    textPatterns: [
      /\bportal\s+de\s+compras\s+p[uú]blicas\b/i,
      /\bportaldecompraspublicas\b/i,
      /\becustomize\b/i,
    ],
  },
  {
    name: "BLL Compras",
    searchUrl: "https://bllcompras.com/Process/ProcessSearchPublic?param1=0",
    hostPatterns: [/bllcompras\.com/i, /bll\.org\.br/i],
    textPatterns: [
      /\bbll\s*compras\b/i,
      /\bbll\.org\.br\b/i,
      /\bbolsa de licita[cç][oõ]es e leil[oõ]es\b/i,
    ],
  },
  {
    name: "Portal M2A Tecnologia",
    searchUrl: "https://compras.m2atecnologia.com.br",
    hostPatterns: [/m2atecnologia\.com\.br/i, /m2a\./i],
    textPatterns: [
      /\bm2a\s*tecnologia\b/i,
      /\bportal de compras municipais\s*-?\s*m2a\b/i,
      /\bm2atecnologia\b/i,
    ],
  },
  {
    name: "Licita + Brasil",
    searchUrl: "https://licitamaisbrasil.com.br",
    hostPatterns: [/licitamaisbrasil\.com\.br/i],
    textPatterns: [/\blicita\s*(?:\+|mais)\s*brasil\b/i, /\blicitamaisbrasil\b/i],
  },
  {
    name: "Licitanet",
    searchUrl: "https://licitanet.com.br/processos",
    hostPatterns: [/licitanet\.com\.br/i],
    textPatterns: [/\blicitanet\b/i],
  },
  {
    name: "BNC Compras",
    searchUrl: "https://bnccompras.com",
    hostPatterns: [/bnccompras\.com/i, /bnc\.org\.br/i],
    textPatterns: [
      /\bbnc\s*compras\b/i,
      /\bbnc\.org\.br\b/i,
      /\bbolsa nacional de compras\b/i,
    ],
  },
  {
    name: "BBMNET Licitações",
    searchUrl: "https://novobbmnet.com.br",
    hostPatterns: [/bbmnet/i, /novobbmnet\.com\.br/i],
    textPatterns: [/\bbbmnet\b/i, /\bbolsa brasileira de mercadorias\b/i],
  },
  {
    name: "Licitações-e (Banco do Brasil)",
    searchUrl: "https://licitacoes-e2.bb.com.br/aop-inter-estatico/",
    hostPatterns: [/licitacoes-e/i],
    textPatterns: [/\blicita[cç][oõ]es-e\b/i, /\blicitacoese\b/i],
  },
  {
    name: "Portal de Compras do Ceará (SEPLAG/CE)",
    searchUrl: "https://sistemas.seplag.ce.gov.br/licitaweb/",
    hostPatterns: [/seplag\.ce\.gov\.br/i],
    textPatterns: [
      /\bseplag\.ce\.gov\.br\b/i,
      /\blicitaweb\b/i,
      /\bportal de compras do estado do cear[aá]\b/i,
    ],
  },
  {
    name: "Portal de Compras de Fortaleza",
    searchUrl: "https://compras.fortaleza.ce.gov.br",
    hostPatterns: [/compras\.fortaleza\.ce\.gov\.br/i, /fortaleza\.ce\.gov\.br/i],
    textPatterns: [/\bcompras\.fortaleza\.ce\.gov\.br\b/i],
  },
  {
    name: "Portal AMM Licita",
    searchUrl: "https://ammlicita.org.br",
    hostPatterns: [/ammlicita\.org\.br/i],
    textPatterns: [/\bamm\s*licita\b/i, /\bammlicita\b/i],
  },
  {
    name: "Portal ComprasBR",
    searchUrl: "https://comprasbr.com.br",
    hostPatterns: [/comprasbr\.com\.br/i],
    textPatterns: [/\bcomprasbr\b/i],
  },
];

export const KNOWN_PORTAL_NAMES = KNOWN_BIDDING_PORTALS.map((p) => p.name);

export function cleanExternalUrl(u?: string | null): string | null {
  if (!u || typeof u !== "string") return null;
  const trimmed = u.trim().replace(/[),.;]+$/, "");
  if (!trimmed || /\s/.test(trimmed) || !trimmed.includes(".")) return null;
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (!parsed.hostname || !parsed.hostname.includes(".")) return null;
    if (parsed.hostname.toLowerCase().includes("pncp.gov.br")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function extractFirstUrlFromText(text?: string | null): string | null {
  if (!text) return null;
  const match = text.match(
    /(?:https?:\/\/|www\.)[^\s<>"'()]+|(?:[a-z0-9-]+\.)+(?:com\.br|gov\.br|org\.br)(?:\/[^\s<>"'()]*)?/i,
  );
  if (!match) return null;
  return cleanExternalUrl(match[0]);
}

function isUrlDeepLink(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const hasPath = parsed.pathname && parsed.pathname !== "/" && parsed.pathname.length > 2;
    const hasQuery = parsed.search && parsed.search.length > 1;
    return Boolean(hasPath || hasQuery);
  } catch {
    return false;
  }
}

export function resolveParticipationPortal(params: {
  disputeUrl: string | null;
  usuarioNome?: string | null;
  complementaryInfo?: string | null;
  object?: string | null;
}): {
  portalName: string | null;
  portalUrl: string | null;
  portalUrlIsDirect: boolean;
  integratorName: string | null;
} {
  const { disputeUrl, usuarioNome, complementaryInfo, object } = params;
  const cleanUser = usuarioNome?.trim() || null;

  // 1. URL oficial de disputa vinda de linkSistemaOrigem
  if (disputeUrl) {
    try {
      const host = new URL(disputeUrl).hostname.toLowerCase();
      for (const platform of KNOWN_BIDDING_PORTALS) {
        if (platform.hostPatterns.some((rx) => rx.test(host))) {
          return {
            portalName: platform.name,
            portalUrl: disputeUrl,
            portalUrlIsDirect: isUrlDeepLink(disputeUrl),
            integratorName: cleanUser,
          };
        }
      }
      const fallbackHostName = host.replace(/^www\./, "");
      return {
        portalName: fallbackHostName,
        portalUrl: disputeUrl,
        portalUrlIsDirect: isUrlDeepLink(disputeUrl),
        integratorName: cleanUser,
      };
    } catch {
      // prossegue para próximas estratégias
    }
  }

  // 2. URL informada dentro de informacaoComplementar
  const textUrl = extractFirstUrlFromText(complementaryInfo);
  if (textUrl) {
    try {
      const host = new URL(textUrl).hostname.toLowerCase();
      for (const platform of KNOWN_BIDDING_PORTALS) {
        if (platform.hostPatterns.some((rx) => rx.test(host))) {
          return {
            portalName: platform.name,
            portalUrl: textUrl,
            portalUrlIsDirect: isUrlDeepLink(textUrl),
            integratorName: cleanUser,
          };
        }
      }
      return {
        portalName: host.replace(/^www\./, ""),
        portalUrl: textUrl,
        portalUrlIsDirect: isUrlDeepLink(textUrl),
        integratorName: cleanUser,
      };
    } catch {
      // ignora
    }
  }

  // 3. Plataforma identificada pelo usuarioNome ou menção textual explícita
  const combinedSource = [cleanUser ?? "", complementaryInfo ?? "", object ?? ""].join(" | ");
  for (const platform of KNOWN_BIDDING_PORTALS) {
    if (platform.textPatterns.some((rx) => rx.test(combinedSource))) {
      return {
        portalName: platform.name,
        portalUrl: platform.searchUrl,
        portalUrlIsDirect: false,
        integratorName: cleanUser,
      };
    }
  }

  // Sem plataforma eletrônica externa detectada (ex: integradores municipais como UMUPP ou licitação presencial)
  return {
    portalName: null,
    portalUrl: null,
    portalUrlIsDirect: false,
    integratorName: cleanUser,
  };
}

export function mapRawToBid(raw: RawPncpItem, nowMs = Date.now()): MePncpBid {
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

  const disputeUrl = cleanExternalUrl(raw.linkSistemaOrigem);
  const electronicProcessUrl = cleanExternalUrl(raw.linkProcessoEletronico);
  const agencyCnpj = raw.orgaoEntidade?.cnpj ?? "";
  const agencyName = raw.orgaoEntidade?.razaoSocial ?? "Órgão público";
  const objectText = (raw.objetoCompra ?? "Objeto não informado").trim();
  const complementaryInfo = raw.informacaoComplementar?.trim() || null;

  const portal = resolveParticipationPortal({
    disputeUrl,
    usuarioNome: raw.usuarioNome,
    complementaryInfo,
    object: objectText,
  });

  const rawUnitCode = raw.unidadeOrgao?.codigoUnidade;
  const uasgCode =
    rawUnitCode != null && String(rawUnitCode).trim() !== ""
      ? String(rawUnitCode).trim()
      : null;

  const confidentialBudget =
    raw.orcamentoSigilosoCodigo != null && raw.orcamentoSigilosoCodigo !== 1
      ? true
      : Boolean(
          raw.orcamentoSigilosoDescricao &&
            !raw.orcamentoSigilosoDescricao.toLowerCase().includes("sem sigilo"),
        );

  const rawSphere = raw.orgaoEntidade?.esferaId?.trim().toUpperCase() || null;
  const sphereName =
    rawSphere === "M"
      ? "Municipal"
      : rawSphere === "E"
        ? "Estadual"
        : rawSphere === "F"
          ? "Federal"
          : rawSphere === "D"
            ? "Distrital"
            : null;

  const rawPower = raw.orgaoEntidade?.poderId?.trim().toUpperCase() || null;
  const powerName =
    rawPower === "E"
      ? "Executivo"
      : rawPower === "L"
        ? "Legislativo"
        : rawPower === "J"
          ? "Judiciário"
          : null;

  const lowerObj = `${objectText} ${raw.modalidadeNome ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const hasServiceHint =
    /\b(servic|prestacao|locacao|manutencao|reforma|obra|engenharia|assessoria|consultoria|transporte|dedetizacao|limpeza urbana|capacitacao)\w*/i.test(
      lowerObj,
    );
  const hasMaterialHint =
    /\b(aquisicao|fornecimento|material|materiais|equipamento|medicamento|generos|combustive|veiculo|mobiliario|insumo|produto|pecas|fardamento)\w*/i.test(
      lowerObj,
    );

  const inferredKind: "material" | "service" | "both" =
    hasMaterialHint && !hasServiceHint
      ? "material"
      : hasServiceHint && !hasMaterialHint
        ? "service"
        : "both";

  return {
    id:
      raw.numeroControlePNCP ||
      `${agencyCnpj}-1-${String(raw.sequencialCompra).padStart(6, "0")}/${raw.anoCompra}`,
    purchaseNumber:
      raw.numeroCompra || `${raw.sequencialCompra}/${raw.anoCompra}`,
    process: raw.processo?.trim() || null,
    year: raw.anoCompra,
    sequential: raw.sequencialCompra,
    object: objectText,
    complementaryInfo,
    modalityId: raw.modalidadeId,
    modality: raw.modalidadeNome || "Licitação",
    disputeMode: raw.modoDisputaNome ?? null,
    instrumentType: raw.tipoInstrumentoConvocatorioNome ?? null,
    legalBasis: raw.amparoLegal?.nome?.trim() ?? null,
    legalBasisDescription: raw.amparoLegal?.descricao?.trim() ?? null,
    srp: Boolean(raw.srp),
    confidentialBudget,
    situation: raw.situacaoCompraNome || "Divulgada no PNCP",
    agencyCnpj,
    agencyName,
    unitName: raw.unidadeOrgao?.nomeUnidade?.trim() || agencyName,
    uasgCode,
    sphereId: rawSphere,
    sphereName,
    powerName,
    inferredKind,
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
    disputeUrl: portal.portalUrlIsDirect ? portal.portalUrl : disputeUrl,
    electronicProcessUrl,
    pncpGovUrl: `https://pncp.gov.br/app/editais/${agencyCnpj}/${raw.anoCompra}/${raw.sequencialCompra}`,
    systemName: portal.portalName ?? portal.integratorName,
    portalName: portal.portalName,
    portalUrl: portal.portalUrl,
    portalUrlIsDirect: portal.portalUrlIsDirect,
    integratorName: portal.integratorName,
  };
}

/**
 * Extrai { cnpj, ano, sequencial } de um numeroControlePNCP (ex: "07598709000180-1-000179/2025").
 */
export function parsePncpControlNumber(
  controlId: string,
): { cnpj: string; ano: number; sequencial: number } | null {
  const match = controlId
    .trim()
    .match(/^(\d{14})-\d+-0*(\d+)\/(\d{4})$/);
  if (!match) return null;
  const sequencial = Number.parseInt(match[2], 10);
  const ano = Number.parseInt(match[3], 10);
  if (!Number.isFinite(sequencial) || !Number.isFinite(ano)) return null;
  return { cnpj: match[1], ano, sequencial };
}
