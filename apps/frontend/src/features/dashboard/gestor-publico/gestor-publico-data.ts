import { landingMunicipalities } from "@/features/landing/landing-municipalities";

export const GESTOR_PUBLICO_YEARS = [2026, 2025, 2024] as const;
export const ALL_MUNICIPALITIES = "todos";

export const GESTOR_PUBLICO_NATURES = [
  { code: "39", label: "Outros Serviços de Terceiros — Pessoa Jurídica" },
  { code: "30", label: "Material de Consumo" },
  { code: "51", label: "Obras e Instalações" },
  { code: "52", label: "Equipamentos e Material Permanente" },
  { code: "32", label: "Material, Bem ou Serviço para Distribuição Gratuita" },
  { code: "40", label: "Serviços de Tecnologia da Informação e Comunicação — Pessoa Jurídica" },
  { code: "35", label: "Serviços de Consultoria" },
] as const;

export type NatureCode = (typeof GESTOR_PUBLICO_NATURES)[number]["code"];
export type SupplierSize = "MEI" | "ME" | "EPP" | "Demais empresas";
export type SupplierOrigin = "Local" | "Regional" | "Externa";
export type ClassificationStatus = "Classificado" | "Classificação pendente";

export interface GestorPublicFilters {
  municipalities: string[];
  year: number;
  nature: NatureCode | "";
  origin: SupplierOrigin | "";
  size: SupplierSize | "";
}

export interface MunicipalitySummary {
  id: string;
  tceCode: string;
  name: string;
  region: string;
  total: number;
  mpeValue: number;
  mpePercent: number;
  localValue: number;
  localPercent: number;
  suppliers: number;
  updatedAt: string;
  natures: Record<NatureCode, number>;
  monthly: number[];
}

export interface SupplierSummary {
  id: string;
  cnpj: string;
  name: string;
  size: SupplierSize;
  classification: ClassificationStatus;
  municipality: string;
  municipalityId: string;
  state: string;
  origin: SupplierOrigin;
  total: number;
  municipalitiesServed: number;
  nature: NatureCode;
  updatedAt: string;
}

export interface NatureSummary {
  code: NatureCode;
  label: string;
  value: number;
  mpeValue: number;
  mpePercent: number;
}

export interface DashboardData {
  selected: MunicipalitySummary[];
  allMunicipalities: MunicipalitySummary[];
  totals: {
    total: number;
    mpeValue: number;
    mpePercent: number;
    localValue: number;
    suppliers: number;
    municipalities: number;
  };
  natures: NatureSummary[];
  monthly: number[];
  origins: Array<{ label: SupplierOrigin; value: number; percent: number }>;
  topMunicipalities: MunicipalitySummary[];
  suppliers: SupplierSummary[];
  diagnostics: Array<{ tone: "blue" | "gold" | "teal" | "red"; title: string; value: string; description: string }>;
}

const regions = ["Litoral", "Sertão", "Cariri", "Centro-Norte"];
const sizes: SupplierSize[] = ["MEI", "ME", "EPP", "Demais empresas"];
const origins: SupplierOrigin[] = ["Local", "Regional", "Externa"];
const natureBases = [64879190, 28000567, 30116010, 3588864, 1610530, 10484, 1083281];
const supplierNames = ["Norte Serviços e Materiais", "Costa Construções", "Litoral Tecnologia", "Sertão Comercial", "Planalto Consultoria", "Aquarela Distribuidora", "Prime Engenharia", "Ceará Soluções"];

function hash(value: string): number {
  return [...value].reduce((total, char, index) => (total + char.charCodeAt(0) * (index + 3)) % 100000, 17);
}

function moneyNumber(value: number): number {
  return Math.round(value * 100) / 100;
}

function percent(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}

function isoDate(year: number, seed: number): string {
  return `${year}-${String((seed % 9) + 1).padStart(2, "0")}-15`;
}

function summaryFor(municipality: (typeof landingMunicipalities)[number], year: number): MunicipalitySummary {
  const seed = hash(`${municipality.ibgeCode}-${year}`);
  const scale = 0.48 + (seed % 94) / 100;
  const natureValues = Object.fromEntries(GESTOR_PUBLICO_NATURES.map(({ code }, index) => [code, moneyNumber(natureBases[index] * scale * (0.7 + ((seed + index * 13) % 48) / 100))])) as Record<NatureCode, number>;
  const total = Object.values(natureValues).reduce((sum, value) => sum + value, 0);
  const mpePercent = 18 + (seed % 31);
  const mpeValue = moneyNumber(total * mpePercent / 100);
  const localPercent = 6 + (seed % 20) / 1.7;
  const suppliers = 16 + (seed % 74);
  const monthly = Array.from({ length: 12 }, (_, index) => moneyNumber(total * (0.035 + ((seed + index * 11) % 90) / 1000)));
  return {
    id: municipality.ibgeCode,
    tceCode: municipality.tceCode,
    name: municipality.name,
    region: regions[seed % regions.length],
    total,
    mpeValue,
    mpePercent: percent(mpeValue, total),
    localValue: moneyNumber(total * localPercent / 100),
    localPercent,
    suppliers,
    updatedAt: isoDate(year, seed),
    natures: natureValues,
    monthly,
  };
}

export function getMunicipalitySummaries(year: number): MunicipalitySummary[] {
  return landingMunicipalities.map((municipality) => summaryFor(municipality, year));
}

function supplierRowsFor(summary: MunicipalitySummary, year: number): SupplierSummary[] {
  const seed = hash(`${summary.id}-suppliers-${year}`);
  return Array.from({ length: 8 }, (_, index) => {
    const supplierSeed = seed + index * 31;
    const size = sizes[supplierSeed % sizes.length];
    const origin = origins[supplierSeed % origins.length];
    const nature = GESTOR_PUBLICO_NATURES[supplierSeed % GESTOR_PUBLICO_NATURES.length].code;
    return {
      id: `${summary.id}-${index}`,
      cnpj: `12.${String((supplierSeed % 900) + 100).padStart(3, "0")}.${String((supplierSeed * 7) % 900).padStart(3, "0")}/0001-${String((supplierSeed * 11) % 90).padStart(2, "0")}`,
      name: `${supplierNames[supplierSeed % supplierNames.length]} ${index + 1}`,
      size,
      classification: supplierSeed % 9 === 0 ? "Classificação pendente" : "Classificado",
      municipality: summary.name,
      municipalityId: summary.id,
      state: "CE",
      origin,
      total: moneyNumber(summary.total * (0.025 + (supplierSeed % 80) / 1000)),
      municipalitiesServed: 1 + (supplierSeed % 12),
      nature,
      updatedAt: summary.updatedAt,
    };
  });
}

export function getSupplierSummaries(summaries: MunicipalitySummary[], year: number): SupplierSummary[] {
  return summaries.flatMap((summary) => supplierRowsFor(summary, year));
}

export function getDashboardData(filters: GestorPublicFilters): DashboardData {
  const allMunicipalities = getMunicipalitySummaries(filters.year);
  const selected = filters.municipalities.length
    ? allMunicipalities.filter((municipality) => filters.municipalities.includes(municipality.id))
    : allMunicipalities;
  const rows = selected.length ? selected : allMunicipalities;
  const activeNatures = filters.nature
    ? GESTOR_PUBLICO_NATURES.filter(({ code }) => code === filters.nature)
    : GESTOR_PUBLICO_NATURES;
  const valueForNature = (row: MunicipalitySummary, code: NatureCode) => row.natures[code];
  const total = rows.reduce((sum, row) => sum + (filters.nature ? valueForNature(row, filters.nature) : row.total), 0);
  const mpeValue = rows.reduce((sum, row) => {
    if (!filters.nature) return sum + row.mpeValue;
    return sum + row.mpeValue * (valueForNature(row, filters.nature) / Math.max(1, row.total));
  }, 0);
  const localValue = rows.reduce((sum, row) => {
    if (!filters.nature) return sum + row.localValue;
    return sum + row.localValue * (valueForNature(row, filters.nature) / Math.max(1, row.total));
  }, 0);
  const suppliers = rows.reduce((sum, row) => sum + row.suppliers, 0);
  const natures = activeNatures.map(({ code, label }) => {
    const value = rows.reduce((sum, row) => sum + row.natures[code], 0);
    const ratio = rows.reduce((sum, row) => sum + row.mpeValue * (row.natures[code] / row.total), 0);
    return { code, label, value, mpeValue: ratio, mpePercent: percent(ratio, value) };
  });
  const monthly = Array.from({ length: 12 }, (_, index) => rows.reduce((sum, row) => {
    if (!filters.nature) return sum + row.monthly[index];
    return sum + row.monthly[index] * (valueForNature(row, filters.nature) / Math.max(1, row.total));
  }, 0));
  const originValues = [localValue, Math.max(0, total * 0.24), Math.max(0, total - localValue - total * 0.24)];
  const suppliersRows = getSupplierSummaries(rows, filters.year).filter((supplier) => (
    (!filters.origin || supplier.origin === filters.origin) &&
    (!filters.size || supplier.size === filters.size) &&
    (!filters.nature || supplier.nature === filters.nature)
  ));
  const topMunicipalities = [...allMunicipalities].sort((a, b) => b.mpePercent - a.mpePercent).slice(0, 5);
  const lowMpe = [...allMunicipalities].sort((a, b) => a.mpePercent - b.mpePercent)[0];
  const mostExternal = [...allMunicipalities].sort((a, b) => (b.total - b.localValue) - (a.total - a.localValue))[0];
  const concentrated = [...allMunicipalities].sort((a, b) => b.total / b.suppliers - a.total / a.suppliers)[0];
  return {
    selected: rows,
    allMunicipalities,
    totals: { total, mpeValue, mpePercent: percent(mpeValue, total), localValue, suppliers, municipalities: rows.length },
    natures,
    monthly,
    origins: originValues.map((value, index) => ({ label: origins[index], value, percent: percent(value, total) })),
    topMunicipalities,
    suppliers: suppliersRows.sort((a, b) => b.total - a.total),
    diagnostics: [
      { tone: "gold", title: "Baixa participação de ME", value: lowMpe.name, description: `${lowMpe.mpePercent.toFixed(1).replace(".", ",")}% do valor comprado fica com ME.` },
      { tone: "red", title: "Compras fora do município", value: mostExternal.name, description: `${percent(mostExternal.total - mostExternal.localValue, mostExternal.total).toFixed(1).replace(".", ",")}% do valor sai da economia local.` },
      { tone: "blue", title: "Maior concentração", value: concentrated.name, description: `R$ ${(concentrated.total / concentrated.suppliers).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} por fornecedor, em média.` },
    ],
  };
}

export function findMunicipality(id: string, year: number): MunicipalitySummary | null {
  const municipality = landingMunicipalities.find((item) => item.ibgeCode === id);
  return municipality ? summaryFor(municipality, year) : null;
}

export function natureName(code: string): string {
  return GESTOR_PUBLICO_NATURES.find((nature) => nature.code === code)?.label ?? "Natureza não identificada";
}
