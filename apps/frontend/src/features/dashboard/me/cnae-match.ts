import type { CompanyCnae } from "@/hooks/useUserProfile";
import { RADAR_SECTORS, type RadarFilterConfig } from "./radar-types";

export interface MePncpBid {
  id: string; // numeroControlePNCP
  purchaseNumber: string;
  process: string | null;
  year: number;
  sequential: number;
  object: string;
  complementaryInfo: string | null;
  modalityId: number;
  modality: string;
  disputeMode: string | null;
  instrumentType: string | null;
  legalBasis: string | null;
  legalBasisDescription: string | null;
  srp: boolean;
  confidentialBudget?: boolean;
  situation: string;
  agencyCnpj: string;
  agencyName: string;
  unitName: string;
  uasgCode: string | null;
  sphereId?: string | null;
  sphereName?: string | null;
  powerName?: string | null;
  inferredKind?: "material" | "service" | "both";
  city: string;
  uf: string;
  ibgeCode: string | null;
  estimatedValue: number | null;
  awardedValue: number | null;
  publishedAt: string | null;
  updatedAt: string | null;
  openingAt: string | null;
  closingAt: string | null;
  isOpen: boolean;
  daysLeft: number | null;
  disputeUrl: string | null;
  electronicProcessUrl: string | null;
  pncpGovUrl: string;
  systemName: string | null;
  portalName: string | null;
  portalUrl: string | null;
  portalUrlIsDirect: boolean;
  integratorName: string | null;
}

export interface MeBidDocument {
  id: number;
  title: string;
  typeName: string;
  publishedAt: string | null;
  url: string;
}

export interface MeBidItem {
  number: number;
  description: string;
  kind: string | null; // Material ou Serviço
  quantity: number | null;
  unit: string | null;
  unitValue: number | null;
  totalValue: number | null;
  confidentialBudget: boolean;
  situation: string | null;
  benefitName: string | null; // Ex: Participação exclusiva para ME/EPP
  judgmentCriteria: string | null;
}

export interface MeBidDetailResponse {
  bid: MePncpBid | null;
  documents: MeBidDocument[];
  items: MeBidItem[];
  totalItems: number;
}

export interface CnaeMatchResult {
  isMatch: boolean;
  score: number; // 0 a 99
  matchedCnae: string | null;
  matchedKeywords: string[];
  sameCity: boolean;
}

export type EnrichedMeBid = MePncpBid & {
  match: CnaeMatchResult;
  distanceKm?: number | null;
};

export interface MePncpSyncMeta {
  scope: string;
  totalOpenBids: number;
  pncpTotalRecords: number;
  pncpTotalPages: number;
  pncpFetchedPages: number;
  isComplete: boolean;
  updatedAt: string;
}

export interface MeOpenBidsResponse {
  bids: MePncpBid[];
  meta: MePncpSyncMeta;
}

export type MeBidSortBy = "match" | "deadline" | "value" | "recent";

export interface MePaginatedBidsRequest {
  ibge?: string;
  uf?: string;
  page: number;
  pageSize: number;
  query?: string;
  city?: string;
  modality?: string;
  onlyCnaeMatch?: boolean;
  sortBy?: MeBidSortBy;
  favoritesOnly?: boolean;
  favoriteIds?: string[];
  hiddenBidIds?: string[];
  onlyHidden?: boolean;
  radarConfig?: RadarFilterConfig;
  companyProfile?: CompanyMatchProfile;
}

export interface MePaginatedBidsResponse {
  items: EnrichedMeBid[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
  facets: {
    cities: string[];
    modalities: string[];
    portals?: string[];
    spheres?: Array<{ value: string; label: string }>;
  };
  meta: MePncpSyncMeta;
}

const STOPWORDS = new Set([
  "comercio",
  "varejista",
  "atacadista",
  "servicos",
  "servico",
  "produtos",
  "produto",
  "mercadorias",
  "mercadoria",
  "geral",
  "especificados",
  "especificado",
  "anteriormente",
  "outros",
  "outras",
  "artigos",
  "artigo",
  "equipamentos",
  "equipamento",
  "materiais",
  "material",
  "atividades",
  "atividade",
  "apoio",
  "predominancia",
  "especializado",
  "especializada",
  "especializados",
  "especializadas",
  "manutencao",
  "manutencoes",
  "reparacao",
  "reparacoes",
  "instalacao",
  "instalacoes",
  "fabricacao",
  "aluguel",
  "locacao",
  "locacoes",
  "pessoal",
  "pessoais",
  "domestico",
  "domestica",
  "domesticos",
  "domesticas",
  "nacional",
  "nacionais",
  "publico",
  "publica",
  "publicos",
  "publicas",
  "administrativo",
  "administrativa",
  "comercial",
  "comerciais",
  "industrial",
  "industriais",
  "profissional",
  "profissionais",
  "empresa",
  "empresas",
  "fornecimento",
  "prestacao",
  "contratacao",
  "aquisicao",
  "registro",
  "precos",
  "para",
  "como",
  "pela",
  "pelo",
  "seus",
  "suas",
  "exceto",
  "sob",
  "encomenda",
  "uso",
  "tipo",
  "fins",
  "area",
  "areas",
  "rede",
  "redes",
  "bens",
  "pecas",
  "partes",
]);

// Mapa semântico que expande termos comuns de CNAE para os termos usados nos
// objetos de licitação das prefeituras no PNCP.
const SEGMENT_SYNONYMS: Array<{
  triggers: string[];
  keywords: string[];
  label: string;
}> = [
  {
    label: "Alimentação e Merenda",
    triggers: [
      "aliment",
      "minimercado",
      "mercearia",
      "supermercado",
      "hipermercado",
      "padaria",
      "panificacao",
      "laticinio",
      "hortifrut",
      "acougue",
      "carne",
      "bebida",
      "restaurante",
      "lanchonete",
      "refeic",
      "buffet",
      "cesta",
    ],
    keywords: [
      "generos alimenticios",
      "merenda escolar",
      "alimentacao escolar",
      "pereciveis",
      "hortifruti",
      "carnes",
      "panificacao",
      "cestas basicas",
      "refeicoes",
      "coffee break",
      "lanches",
      "agua mineral",
      "leite",
    ],
  },
  {
    label: "Tecnologia e Informática",
    triggers: [
      "informatica",
      "computador",
      "software",
      "sistema",
      "programacao",
      "processamento",
      "dados",
      "suprimento",
      "periferico",
      "telecomunic",
      "rede",
      "portal",
      "hospedagem",
    ],
    keywords: [
      "computadores",
      "notebooks",
      "impressoras",
      "informatica",
      "software",
      "licenca",
      "sistema",
      "tecnologia",
      "rede logica",
      "servidor",
      "toner",
      "cartucho",
      "tablet",
      "digitalizacao",
      "internet",
    ],
  },
  {
    label: "Construção, Obras e Engenharia",
    triggers: [
      "construcao",
      "engenharia",
      "arquitetura",
      "edificios",
      "obras",
      "pavimentacao",
      "terraplanagem",
      "alvenaria",
      "hidraulica",
      "eletrica",
      "pintura",
      "ferragem",
      "cimento",
      "madeira",
      "tinta",
    ],
    keywords: [
      "reforma",
      "ampliacao",
      "pavimentacao",
      "construcao",
      "engenharia",
      "manutencao predial",
      "obras",
      "calçamento",
      "asfaltica",
      "drenagem",
      "iluminacao publica",
      "material de construcao",
      "cimento",
      "eletrico",
      "hidraulico",
    ],
  },
  {
    label: "Saúde, Medicamentos e Hospitalar",
    triggers: [
      "farmaceutic",
      "medicamento",
      "farmacia",
      "drogar",
      "hospitalar",
      "medico",
      "odontologic",
      "laborator",
      "ortopedic",
      "cosmetic",
      "perfumaria",
      "higiene",
    ],
    keywords: [
      "medicamentos",
      "material medico",
      "hospitalar",
      "odontologico",
      "ambulatorial",
      "insumos",
      "laboratorial",
      "curativos",
      "seringas",
      "oxigenio",
      "fisioterapia",
      "saude",
      "farmacia",
    ],
  },
  {
    label: "Papelaria, Expediente e Gráfica",
    triggers: [
      "papelaria",
      "escritorio",
      "expediente",
      "grafica",
      "impressao",
      "livro",
      "jornais",
      "revista",
      "didatico",
    ],
    keywords: [
      "material de expediente",
      "papelaria",
      "material didatico",
      "material escolar",
      "servicos graficos",
      "impressos",
      "banners",
      "adesivos",
      "papel a4",
      "escritorio",
    ],
  },
  {
    label: "Limpeza, Conservação e Descartáveis",
    triggers: [
      "limpeza",
      "conservacao",
      "saneante",
      "domissanitario",
      "dedetizacao",
      "pragas",
      "jardinagem",
      "embalagen",
      "descartave",
    ],
    keywords: [
      "material de limpeza",
      "higienizacao",
      "saneantes",
      "descartaveis",
      "copa e cozinha",
      "dedetizacao",
      "controle de pragas",
      "conservacao",
      "zeladoria",
      "limpeza urbana",
      "coleta de residuos",
    ],
  },
  {
    label: "Veículos, Peças, Combustíveis e Transporte",
    triggers: [
      "automotor",
      "veiculo",
      "automove",
      "pecas",
      "pneumatico",
      "pneu",
      "combustive",
      "lubrificante",
      "transporte",
      "escolar",
      "passageiro",
      "carga",
      "fretamento",
    ],
    keywords: [
      "combustivel",
      "gasolina",
      "oleo diesel",
      "lubrificantes",
      "pecas automotivas",
      "pneus",
      "manutencao de veiculos",
      "frota",
      "transporte escolar",
      "locacao de veiculos",
      "ambulancia",
    ],
  },
  {
    label: "Móveis, Eletrodomésticos e Climatização",
    triggers: [
      "moveis",
      "mobiliario",
      "colchoaria",
      "eletrodomestic",
      "ar condicionado",
      "refrigeracao",
      "ventilacao",
    ],
    keywords: [
      "mobiliario",
      "moveis",
      "cadeiras",
      "mesas",
      "armarios",
      "eletrodomesticos",
      "ar condicionado",
      "climatizacao",
      "refrigeracao",
      "ventiladores",
    ],
  },
  {
    label: "Eventos, Comunicação e Publicidade",
    triggers: [
      "evento",
      "festas",
      "sonorizacao",
      "iluminacao",
      "publicidade",
      "propaganda",
      "comunicacao",
      "fotograf",
      "filmagem",
    ],
    keywords: [
      "eventos",
      "sonorizacao",
      "palco",
      "tendas",
      "iluminacao",
      "publicidade",
      "comunicacao visual",
      "locacao de estrutura",
      "cerimonial",
    ],
  },
  {
    label: "Vestuário, Confecção e Fardamento",
    triggers: [
      "vestuario",
      "confeccao",
      "roupa",
      "calcado",
      "tecido",
      "cama",
      "mesa",
      "banho",
      "armarinho",
    ],
    keywords: [
      "fardamento",
      "uniformes",
      "camisetas",
      "vestuario",
      "calcados",
      "tecido",
      "enxoval",
      "epi",
    ],
  },
  {
    label: "Consultoria, Contabilidade e Gestão",
    triggers: [
      "consultoria",
      "contabil",
      "auditoria",
      "advocacia",
      "juridic",
      "gestao",
      "empresarial",
      "treinamento",
      "capacitacao",
    ],
    keywords: [
      "assessoria",
      "consultoria",
      "contabil",
      "juridica",
      "capacitacao",
      "treinamento",
      "auditoria",
      "gestao publica",
    ],
  },
];

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTokens(text: string): string[] {
  const normalized = normalizeText(text);
  return normalized
    .split(" ")
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word));
}

export interface CompanyMatchProfile {
  cnaes: CompanyCnae[];
  customCnaeText?: string;
  extraKeywords?: string[];
  companyCity?: string | null;
  companyIbge?: number | null;
}

export function evaluateBidMatch(
  bid: MePncpBid,
  company: CompanyMatchProfile,
): CnaeMatchResult {
  const bidText = normalizeText(
    `${bid.object} ${bid.complementaryInfo ?? ""}`,
  );

  const sameCity = Boolean(
    (company.companyIbge &&
      bid.ibgeCode &&
      String(company.companyIbge) === String(bid.ibgeCode)) ||
      (company.companyCity &&
        normalizeText(company.companyCity) === normalizeText(bid.city)),
  );

  const allCnaeSources: Array<{ label: string; text: string; isPrincipal: boolean }> = [
    ...company.cnaes.map((c) => ({
      label: c.codigo ? `${c.codigo} - ${c.descricao}` : c.descricao,
      text: c.descricao,
      isPrincipal: c.isPrincipal,
    })),
  ];

  if (company.customCnaeText?.trim()) {
    allCnaeSources.push({
      label: company.customCnaeText.trim(),
      text: company.customCnaeText.trim(),
      isPrincipal: allCnaeSources.length === 0,
    });
  }

  const extraTerms = (company.extraKeywords ?? [])
    .map((k) => k.trim())
    .filter(Boolean);

  if (allCnaeSources.length === 0 && extraTerms.length === 0) {
    return {
      isMatch: false,
      score: sameCity ? 35 : 0,
      matchedCnae: null,
      matchedKeywords: [],
      sameCity,
    };
  }

  let bestScore = 0;
  let bestCnae: string | null = null;
  let bestKeywords: string[] = [];
  const paddedBidText = ` ${bidText} `;

  for (const source of allCnaeSources) {
    const normSource = ` ${normalizeText(source.text)} `;
    const tokens = extractTokens(source.text);
    let sourceScore = 0;
    const sourceKeywords = new Set<string>();

    // 1. Correspondência direta de radicais/tokens do CNAE no objeto do edital
    for (const token of tokens) {
      const stem = token.length >= 6 ? token.slice(0, token.length - 1) : token;
      const matched =
        stem.length <= 5
          ? paddedBidText.includes(` ${token} `) ||
            paddedBidText.includes(` ${stem}s `)
          : paddedBidText.includes(` ${stem}`);
      if (matched) {
        sourceKeywords.add(token);
        sourceScore += source.isPrincipal ? 28 : 22;
      }
    }

    // 2. Correspondência semântica por segmento de compras públicas
    for (const seg of SEGMENT_SYNONYMS) {
      const triggered = seg.triggers.some((t) =>
        normSource.includes(` ${normalizeText(t)}`),
      );
      if (!triggered) continue;

      for (const kw of seg.keywords) {
        const normKw = normalizeText(kw);
        const kwMatched =
          normKw.length <= 4
            ? paddedBidText.includes(` ${normKw} `)
            : paddedBidText.includes(` ${normKw}`);
        if (kwMatched) {
          sourceKeywords.add(kw);
          sourceScore += source.isPrincipal ? 32 : 25;
        }
      }
    }

    if (sourceScore > bestScore) {
      bestScore = sourceScore;
      bestCnae = source.label;
      bestKeywords = Array.from(sourceKeywords);
    }
  }

  const extraMatchedKeywords = new Set<string>(bestKeywords);

  // 3. Palavras-chave extras adicionadas pelo usuário no perfil
  for (const term of extraTerms) {
    const normTerm = normalizeText(term);
    if (normTerm.length >= 3 && paddedBidText.includes(` ${normTerm}`)) {
      extraMatchedKeywords.add(term);
      bestScore += 35;
      if (!bestCnae) {
        bestCnae = `Palavra-chave: ${term}`;
      }
    }
  }

  if (bestScore > 0) {
    if (sameCity) bestScore += 12;
    const finalScore = Math.min(98, Math.max(62, bestScore));
    return {
      isMatch: true,
      score: finalScore,
      matchedCnae: bestCnae,
      matchedKeywords: Array.from(extraMatchedKeywords).slice(0, 5),
      sameCity,
    };
  }

  return {
    isMatch: false,
    score: sameCity ? 40 : 15,
    matchedCnae: null,
    matchedKeywords: [],
    sameCity,
  };
}

function termMatchesText(paddedText: string, rawTerm: string): boolean {
  const norm = normalizeText(rawTerm);
  if (!norm) return false;
  if (norm.length <= 3) {
    return paddedText.includes(` ${norm} `);
  }
  return paddedText.includes(` ${norm}`) || paddedText.includes(norm);
}

export function evaluateRadarFilter(
  bid: MePncpBid,
  company: CompanyMatchProfile,
  radarConfig?: RadarFilterConfig,
): { passes: boolean; match: CnaeMatchResult } {
  const effectiveCompany: CompanyMatchProfile =
    radarConfig && !radarConfig.useCompanyCnae
      ? {
          cnaes: [],
          companyCity: company.companyCity,
          companyIbge: company.companyIbge,
        }
      : company;

  const baseMatch = evaluateBidMatch(bid, effectiveCompany);
  if (!radarConfig) {
    return { passes: true, match: baseMatch };
  }

  // 1. Modalidade
  if (
    radarConfig.modality &&
    normalizeText(bid.modality) !== normalizeText(radarConfig.modality)
  ) {
    return { passes: false, match: baseMatch };
  }

  // 2. Portal
  if (radarConfig.portal) {
    const normPortal = normalizeText(radarConfig.portal);
    const bidPortal = normalizeText(
      `${bid.portalName ?? ""} ${bid.systemName ?? ""}`,
    );
    if (!bidPortal.includes(normPortal)) {
      return { passes: false, match: baseMatch };
    }
  }

  // 3. Esfera (M, E, F)
  if (radarConfig.sphere) {
    if ((bid.sphereId ?? "").toUpperCase() !== radarConfig.sphere.toUpperCase()) {
      return { passes: false, match: baseMatch };
    }
  }

  // 4. Registro de Preço (Sim / Não)
  if (radarConfig.srp.length === 1) {
    const wantsSrp = radarConfig.srp[0] === "yes";
    if (Boolean(bid.srp) !== wantsSrp) {
      return { passes: false, match: baseMatch };
    }
  }

  // 5. Tipo (Material / Serviço)
  if (radarConfig.kind.length === 1) {
    const wanted = radarConfig.kind[0];
    const bidKind = bid.inferredKind ?? "both";
    if (bidKind !== "both" && bidKind !== wanted) {
      return { passes: false, match: baseMatch };
    }
  }

  // 6. Valor da compra total (estimado)
  if (radarConfig.minTotalValue !== null && radarConfig.minTotalValue > 0) {
    if (
      bid.estimatedValue === null ||
      bid.estimatedValue < radarConfig.minTotalValue
    ) {
      return { passes: false, match: baseMatch };
    }
  }
  if (radarConfig.maxTotalValue !== null && radarConfig.maxTotalValue > 0) {
    if (
      bid.estimatedValue === null ||
      bid.estimatedValue > radarConfig.maxTotalValue
    ) {
      return { passes: false, match: baseMatch };
    }
  }

  // 7. Valor do item (estimado) — filtra com base no valor estimado do processo quando não há itens individuais carregados em lote
  if (radarConfig.minItemValue !== null && radarConfig.minItemValue > 0) {
    if (
      bid.estimatedValue === null ||
      bid.estimatedValue < radarConfig.minItemValue
    ) {
      return { passes: false, match: baseMatch };
    }
  }
  if (radarConfig.maxItemValue !== null && radarConfig.maxItemValue > 0) {
    if (
      bid.estimatedValue !== null &&
      bid.estimatedValue > radarConfig.maxItemValue * 50
    ) {
      // Se o valor total ultrapassa largamente o teto razoável ou quando compra única excede o máximo por item:
      if (bid.estimatedValue > radarConfig.maxItemValue && !bid.srp) {
        return { passes: false, match: baseMatch };
      }
    }
  }

  const paddedText = ` ${normalizeText(
    `${bid.object} ${bid.complementaryInfo ?? ""} ${bid.agencyName} ${bid.unitName}`,
  )} `;

  // 8. Setor
  if (radarConfig.sector) {
    const sectorDef = RADAR_SECTORS.find((s) => s.id === radarConfig.sector);
    if (sectorDef) {
      const matchesSector = sectorDef.keywords.some((kw) =>
        termMatchesText(paddedText, kw),
      );
      if (!matchesSector) {
        return { passes: false, match: baseMatch };
      }
    }
  }

  // 9. Conjunto de palavras-chave (Grupos com lógica OU entre grupos; dentro do grupo: obrigatórias, desejadas e indesejadas)
  const activeGroups = (radarConfig.keywordGroups ?? []).filter(
    (g) =>
      g.keywords.length > 0 ||
      g.desiredWords.length > 0 ||
      g.excludedWords.length > 0,
  );

  if (activeGroups.length === 0) {
    // Sem grupos preenchidos: garante um Score amigável mesmo quando sem CNAE direto
    const fallbackScore = baseMatch.isMatch
      ? baseMatch.score
      : Math.max(baseMatch.score, baseMatch.sameCity ? 58 : 45);
    return {
      passes: true,
      match: {
        ...baseMatch,
        score: fallbackScore,
      },
    };
  }

  let anyGroupPassed = false;
  let bestGroupBonus = 0;
  let matchedGroupKeywords: string[] = [];
  let matchedGroupLabel: string | null = null;

  for (const group of activeGroups) {
    // Se tiver palavra indesejada presente no texto, este grupo rejeita
    const hasExcluded = group.excludedWords.some((ew) =>
      termMatchesText(paddedText, ew),
    );
    if (hasExcluded) continue;

    // Se tiver palavras-chave principais, ao menos uma precisa bater
    const hitMain =
      group.keywords.length === 0
        ? []
        : group.keywords.filter((kw) => termMatchesText(paddedText, kw));

    if (group.keywords.length > 0 && hitMain.length === 0) {
      continue;
    }

    // Palavras desejadas somam score extra (e se o usuário preencheu SÓ palavras desejadas sem palavras-chave, exige ao menos 1 desejada)
    const hitDesired = group.desiredWords.filter((dw) =>
      termMatchesText(paddedText, dw),
    );

    if (
      group.keywords.length === 0 &&
      group.desiredWords.length > 0 &&
      hitDesired.length === 0
    ) {
      continue;
    }

    anyGroupPassed = true;
    const bonus = hitMain.length * 36 + hitDesired.length * 16;
    if (bonus >= bestGroupBonus) {
      bestGroupBonus = bonus;
      matchedGroupKeywords = [...hitMain, ...hitDesired];
      matchedGroupLabel = group.name;
    }
  }

  if (!anyGroupPassed) {
    return { passes: false, match: baseMatch };
  }

  const combinedKeywords = Array.from(
    new Set([...matchedGroupKeywords, ...baseMatch.matchedKeywords]),
  ).slice(0, 6);

  const rawScore =
    (baseMatch.isMatch ? baseMatch.score : 48) +
    Math.min(45, bestGroupBonus) +
    (baseMatch.sameCity ? 6 : 0);

  const finalScore = Math.min(99, Math.max(68, rawScore));

  return {
    passes: true,
    match: {
      isMatch: true,
      score: finalScore,
      matchedCnae:
        baseMatch.matchedCnae ??
        (matchedGroupLabel ? `Filtro: ${matchedGroupLabel}` : "Radar"),
      matchedKeywords: combinedKeywords,
      sameCity: baseMatch.sameCity,
    },
  };
}
