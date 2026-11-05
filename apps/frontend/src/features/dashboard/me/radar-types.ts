export interface KeywordGroup {
  id: string;
  name: string;
  keywords: string[];
  desiredWords: string[];
  excludedWords: string[];
}

export interface RadarFilterConfig {
  keywordGroups: KeywordGroup[];
  useCompanyCnae: boolean;
  modality: string;
  sector: string;
  locationMode: "state_city" | "radius";
  uf: string;
  city: string;
  radiusBaseCity: string;
  radiusKm: number | null;
  portal: string;
  sphere: string;
  srp: Array<"yes" | "no">;
  kind: Array<"material" | "service">;
  minTotalValue: number | null;
  maxTotalValue: number | null;
  minItemValue: number | null;
  maxItemValue: number | null;
}

export interface SavedRadarFilter {
  id: string;
  name: string;
  isDefault: boolean;
  config: RadarFilterConfig;
  createdAt?: string;
  updatedAt?: string;
}

export const MAX_RADAR_KEYWORDS = 800;

export function createEmptyKeywordGroup(index = 1): KeywordGroup {
  return {
    id: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `Grupo ${index}`,
    keywords: [],
    desiredWords: [],
    excludedWords: [],
  };
}

export function createDefaultRadarConfig(
  overrides?: Partial<RadarFilterConfig>,
): RadarFilterConfig {
  return {
    keywordGroups: [
      {
        id: "grupo-1",
        name: "Grupo 1",
        keywords: [],
        desiredWords: [],
        excludedWords: [],
      },
    ],
    useCompanyCnae: true,
    modality: "",
    sector: "",
    locationMode: "state_city",
    uf: "CE",
    city: "",
    radiusBaseCity: "",
    radiusKm: 100,
    portal: "",
    sphere: "",
    srp: [],
    kind: [],
    minTotalValue: null,
    maxTotalValue: null,
    minItemValue: null,
    maxItemValue: null,
    ...overrides,
  };
}

export function countRadarKeywords(groups: KeywordGroup[]): number {
  let total = 0;
  for (const g of groups) {
    total +=
      (g.keywords?.length ?? 0) +
      (g.desiredWords?.length ?? 0) +
      (g.excludedWords?.length ?? 0);
  }
  return total;
}

export const BRAZIL_STATES: Array<{
  uf: string;
  name: string;
  ibgeCode: number;
}> = [
  { uf: "AC", name: "Acre", ibgeCode: 12 },
  { uf: "AL", name: "Alagoas", ibgeCode: 27 },
  { uf: "AP", name: "Amapá", ibgeCode: 16 },
  { uf: "AM", name: "Amazonas", ibgeCode: 13 },
  { uf: "BA", name: "Bahia", ibgeCode: 29 },
  { uf: "CE", name: "Ceará", ibgeCode: 23 },
  { uf: "DF", name: "Distrito Federal", ibgeCode: 53 },
  { uf: "ES", name: "Espírito Santo", ibgeCode: 32 },
  { uf: "GO", name: "Goiás", ibgeCode: 52 },
  { uf: "MA", name: "Maranhão", ibgeCode: 21 },
  { uf: "MT", name: "Mato Grosso", ibgeCode: 51 },
  { uf: "MS", name: "Mato Grosso do Sul", ibgeCode: 50 },
  { uf: "MG", name: "Minas Gerais", ibgeCode: 31 },
  { uf: "PA", name: "Pará", ibgeCode: 15 },
  { uf: "PB", name: "Paraíba", ibgeCode: 25 },
  { uf: "PR", name: "Paraná", ibgeCode: 41 },
  { uf: "PE", name: "Pernambuco", ibgeCode: 26 },
  { uf: "PI", name: "Piauí", ibgeCode: 22 },
  { uf: "RJ", name: "Rio de Janeiro", ibgeCode: 33 },
  { uf: "RN", name: "Rio Grande do Norte", ibgeCode: 24 },
  { uf: "RS", name: "Rio Grande do Sul", ibgeCode: 43 },
  { uf: "RO", name: "Rondônia", ibgeCode: 11 },
  { uf: "RR", name: "Roraima", ibgeCode: 14 },
  { uf: "SC", name: "Santa Catarina", ibgeCode: 42 },
  { uf: "SP", name: "São Paulo", ibgeCode: 35 },
  { uf: "SE", name: "Sergipe", ibgeCode: 28 },
  { uf: "TO", name: "Tocantins", ibgeCode: 17 },
];

export const RADAR_SPHERES: Array<{ value: string; label: string }> = [
  { value: "M", label: "Municipal" },
  { value: "E", label: "Estadual" },
  { value: "F", label: "Federal" },
];

export const RADAR_RADIUS_OPTIONS = [25, 50, 100, 150, 200, 300, 500] as const;

export interface RadarSectorDef {
  id: string;
  label: string;
  keywords: string[];
}

export const RADAR_SECTORS: RadarSectorDef[] = [
  {
    id: "alimentacao",
    label: "Alimentação e Merenda",
    keywords: [
      "generos alimenticios",
      "merenda",
      "alimentacao",
      "hortifruti",
      "pereciveis",
      "panificacao",
      "cestas basicas",
      "refeicoes",
      "lanches",
      "agua mineral",
      "carnes",
      "leite",
      "coffee break",
    ],
  },
  {
    id: "tecnologia",
    label: "Tecnologia e Informática",
    keywords: [
      "informatica",
      "computador",
      "notebook",
      "impressora",
      "software",
      "sistema",
      "licenca",
      "tecnologia",
      "servidor",
      "toner",
      "tablet",
      "internet",
      "rede logica",
      "digitalizacao",
    ],
  },
  {
    id: "construcao",
    label: "Construção, Obras e Engenharia",
    keywords: [
      "construcao",
      "engenharia",
      "reforma",
      "ampliacao",
      "pavimentacao",
      "obras",
      "manutencao predial",
      "asfaltica",
      "drenagem",
      "iluminacao publica",
      "cimento",
      "eletrico",
      "hidraulico",
    ],
  },
  {
    id: "saude",
    label: "Saúde, Medicamentos e Hospitalar",
    keywords: [
      "medicamento",
      "hospitalar",
      "odontologico",
      "medico",
      "ambulatorial",
      "laboratorial",
      "insumos",
      "curativos",
      "seringas",
      "oxigenio",
      "farmacia",
      "saude",
      "fisioterapia",
    ],
  },
  {
    id: "limpeza_quimicos",
    label: "Limpeza, Conservação e Químicos",
    keywords: [
      "limpeza",
      "higienizacao",
      "saneantes",
      "quimicos",
      "produto quimico",
      "descartaveis",
      "copa e cozinha",
      "dedetizacao",
      "controle de pragas",
      "conservacao",
      "zeladoria",
      "coleta de residuos",
    ],
  },
  {
    id: "papelaria",
    label: "Papelaria, Expediente e Gráfica",
    keywords: [
      "expediente",
      "papelaria",
      "didatico",
      "material escolar",
      "graficos",
      "impressos",
      "banners",
      "adesivos",
      "papel a4",
      "escritorio",
    ],
  },
  {
    id: "veiculos",
    label: "Veículos, Peças, Combustíveis e Transporte",
    keywords: [
      "combustivel",
      "gasolina",
      "oleo diesel",
      "lubrificante",
      "pecas",
      "pneus",
      "veiculo",
      "frota",
      "transporte escolar",
      "locacao de veiculos",
      "ambulancia",
    ],
  },
  {
    id: "moveis",
    label: "Móveis, Eletrodomésticos e Climatização",
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
      "ventilador",
    ],
  },
  {
    id: "eventos",
    label: "Eventos, Comunicação e Publicidade",
    keywords: [
      "eventos",
      "sonorizacao",
      "palco",
      "tendas",
      "publicidade",
      "comunicacao visual",
      "estrutura",
      "cerimonial",
    ],
  },
  {
    id: "vestuario",
    label: "Vestuário, Confecção e EPIs",
    keywords: [
      "fardamento",
      "uniformes",
      "camisetas",
      "vestuario",
      "calcados",
      "tecido",
      "enxoval",
      "epi",
      "equipamento de protecao",
    ],
  },
  {
    id: "consultoria",
    label: "Consultoria, Contabilidade e Gestão",
    keywords: [
      "assessoria",
      "consultoria",
      "contabil",
      "juridica",
      "capacitacao",
      "treinamento",
      "auditoria",
      "gestao",
    ],
  },
  {
    id: "agro_ambiental",
    label: "Agropecuária, Jardinagem e Meio Ambiente",
    keywords: [
      "agricola",
      "agropecuar",
      "sementes",
      "mudas",
      "jardinagem",
      "poda",
      "ambiental",
      "irrigacao",
      "adubo",
      "racao",
    ],
  },
];
