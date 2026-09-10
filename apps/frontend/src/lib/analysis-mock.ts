export type AnalysisMock = {
  municipality: string;
  category: string;
  updatedAt: string;
  records: number;
  totalCommitted: number;
  localValue: number;
  localPercentage: number;
  suppliers: number;
  localSuppliers: number;
  regionalSuppliers: number;
  externalSuppliers: number;
  monthly: Array<number | null>;
  natures: Array<{ name: string; value: number }>;
  topSuppliers: Array<{
    name: string;
    cnpj: string;
    city: string;
    origin: "Local" | "Outros municípios do Ceará" | "Outros estados";
    commitments: number;
    value: number;
  }>;
};

const cityFactor: Record<string, number> = {
  Amontada: 1,
  Itarema: 0.72,
  Itapipoca: 1.46,
  Trairi: 1.18,
};

const categoryFactor: Record<string, number> = {
  Alimentos: 1,
  Tecnologia: 0.64,
  Equipamentos: 1.28,
  Serviços: 0.88,
  "Todas as categorias": 1.82,
};

const natureNames: Record<string, string[]> = {
  Alimentos: [
    "Material de consumo",
    "Gêneros alimentícios",
    "Distribuição gratuita",
    "Outros materiais",
  ],
  Tecnologia: [
    "Serviços de TIC",
    "Equipamentos de processamento",
    "Licenças de software",
    "Manutenção técnica",
  ],
  Equipamentos: [
    "Equipamentos e material permanente",
    "Material hospitalar",
    "Mobiliário",
    "Peças e componentes",
  ],
  Serviços: [
    "Outros serviços PJ",
    "Manutenção e conservação",
    "Consultoria",
    "Locações",
  ],
  "Todas as categorias": [
    "Material de consumo",
    "Outros serviços PJ",
    "Equipamentos permanentes",
    "Obras e instalações",
  ],
};

export function getAnalysisMock(
  municipality: string,
  category: string,
): AnalysisMock {
  const selectedCity =
    municipality === "Todos os municípios" ? "Amontada" : municipality;
  const city = cityFactor[selectedCity] ?? 1;
  const categoryValue = categoryFactor[category] ?? 1;
  const factor = city * categoryValue;
  const total = Math.round(8_436_900 * factor);
  const localPercentage = Math.min(52.8, 32.4 + city * 6);
  const localValue = Math.round((total * localPercentage) / 100);
  const supplierCount = Math.round(84 * Math.pow(factor, 0.42));
  const local = Math.round(supplierCount * 0.38);
  const regional = Math.round(supplierCount * 0.35);

  const monthlyBase: Array<number | null> = [
    420000,
    485000,
    452000,
    610000,
    null,
    684000,
    739000,
    702000,
    811000,
    876000,
    null,
    943000,
  ];
  const monthly = monthlyBase.map((value) =>
    value === null ? null : Math.round(value * factor),
  );
  const distribution = [0.41, 0.28, 0.19, 0.12];
  const names = natureNames[category] ?? natureNames["Todas as categorias"];
  const natures = names.map((name, index) => ({
    name,
    value: Math.round(total * distribution[index]),
  }));

  const supplierNames = [
    ["Cooperativa São José", selectedCity, "Local"],
    ["Litoral Oeste Distribuidora", selectedCity, "Local"],
    ["Ceará Suprimentos Ltda.", "Itapipoca", "Outros municípios do Ceará"],
    ["Norte Comercial e Serviços", "Sobral", "Outros municípios do Ceará"],
    ["Brasil Equipamentos S.A.", "Recife", "Outros estados"],
  ] as const;
  const supplierDistribution = [0.196, 0.158, 0.132, 0.105, 0.081];
  const topSuppliers = supplierNames.map((supplier, index) => ({
    name: supplier[0],
    cnpj: `${12 + index}.34${index}.***/****-${90 - index}`,
    city: supplier[1],
    origin: supplier[2],
    commitments: 18 - index * 2,
    value: Math.round(total * supplierDistribution[index]),
  }));

  return {
    municipality: selectedCity,
    category,
    updatedAt: "09/09/2026, 14:32",
    records: Math.round(1284 * factor),
    totalCommitted: total,
    localValue,
    localPercentage,
    suppliers: supplierCount,
    localSuppliers: local,
    regionalSuppliers: regional,
    externalSuppliers: Math.max(0, supplierCount - local - regional),
    monthly,
    natures,
    topSuppliers,
  };
}
