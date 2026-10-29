import type { CompanyCnae } from "@/hooks/useUserProfile";

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
  situation: string;
  agencyCnpj: string;
  agencyName: string;
  unitName: string;
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
};

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
