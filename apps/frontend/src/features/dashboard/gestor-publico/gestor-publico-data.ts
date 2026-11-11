import { listMunicipalityCodesService } from "@/services/municipalities/list-municipality-codes.service";
import { getPaymentsSummaryService, listLocalPaymentsService, listPaymentSuppliersService } from "@/services/analytics/payments.service";
import type { PaymentSupplier } from "@/services/analytics/payments.types";

export const GESTOR_PUBLICO_YEARS = [2026, 2025, 2024] as const;
export const GESTOR_PUBLICO_NATURES = [
  { code: "39", label: "Outros Serviços de Terceiros — Pessoa Jurídica" },
  { code: "30", label: "Material de Consumo" },
  { code: "51", label: "Obras e Instalações" },
  { code: "52", label: "Equipamentos e Material Permanente" },
  { code: "32", label: "Material, Bem ou Serviço para Distribuição Gratuita" },
  { code: "40", label: "Serviços de Tecnologia da Informação e Comunicação — Pessoa Jurídica" },
  { code: "35", label: "Serviços de Consultoria" },
] as const;

export type NatureCode = string;
export type SupplierSize = "MEI" | "ME" | "EPP" | "Demais empresas";
export type SupplierOrigin = "Local" | "Sede não informada";
export type ClassificationStatus = string;

export interface GestorPublicFilters {
  municipalities: string[];
  year: number;
  nature: NatureCode | "";
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
  meNatures: Record<NatureCode, number>;
  localNatures: Record<NatureCode, number>;
  localSuppliersByNature: Record<NatureCode, number>;
  collectionId: number;
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
  nature: string;
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
  topMunicipalities: MunicipalitySummary[];
  suppliers: SupplierSummary[];
}

function percent(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}
const municipalityCache = new Map<number, Promise<MunicipalitySummary[]>>();
const supplierCache = new Map<string, Promise<SupplierSummary[]>>();
const localSupplierDocumentsCache = new Map<string, Set<string>>();
const natureLabels = new Map<string, string>(GESTOR_PUBLICO_NATURES.map(({ code, label }) => [code, label]));
const localSupplierDocumentsKey = (year: number, summary: MunicipalitySummary) => `${year}:${summary.id}:${summary.collectionId}`;
async function withConcurrency<T, R>(rows: T[], concurrency: number, callback: (row: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(rows.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, async () => {
    while (true) { const index = next++; if (index >= rows.length) return; output[index] = await callback(rows[index]); }
  }));
  return output;
}

async function listAllLocalPayments(query: { codigo_municipio: string; ano: number; coleta_id: number }) {
  const data: Awaited<ReturnType<typeof listLocalPaymentsService>>["data"] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await listLocalPaymentsService({ ...query, limit: 100, offset });
    if (page.offset !== offset || page.coleta_id !== query.coleta_id) throw new Error("A API retornou uma página de pagamentos locais fora da coleta solicitada.");
    data.push(...page.data);
    if (page.data.length < 100) return { ...page, data };
  }
}

export function getMunicipalitySummaries(year: number): Promise<MunicipalitySummary[]> {
  const cached = municipalityCache.get(year);
  if (cached) return cached;
  const pending = (async () => {
    const catalog = await listMunicipalityCodesService();
    return (await withConcurrency(catalog, 6, async (municipality) => {
      try {
        const codigo_municipio = municipality.codigo_municipio.padStart(3, "0");
        const payments = await getPaymentsSummaryService({ codigo_municipio, ano: year });
        const local = await listAllLocalPayments({ codigo_municipio, ano: year, coleta_id: payments.coleta.coleta_id });
        const natures: Record<string, number> = {};
        const meNatures: Record<string, number> = {};
        const localNatures: Record<string, number> = {};
        const localSupplierDocuments = new Map<string, Set<string>>();
        const supplierDocuments = new Set<string>();
        for (const row of payments.data) {
          natureLabels.set(row.codigo_natureza, row.nome_natureza);
          natures[row.codigo_natureza] = Number(row.total_controle);
          meNatures[row.codigo_natureza] = Number(row.valor_me);
        }
        for (const row of local.data) {
          if (row.nome_natureza) natureLabels.set(row.codigo_natureza, row.nome_natureza);
          localNatures[row.codigo_natureza] = (localNatures[row.codigo_natureza] ?? 0) + Number(row.valor_pago);
          const document = row.documento.replace(/\D/g, "");
          supplierDocuments.add(document);
          const documents = localSupplierDocuments.get(row.codigo_natureza) ?? new Set<string>();
          documents.add(document);
          localSupplierDocuments.set(row.codigo_natureza, documents);
        }
        const localSuppliersByNature = Object.fromEntries([...localSupplierDocuments].map(([code, documents]) => [code, documents.size]));
        const total = Number(payments.total_controle);
        const mpeValue = Number(payments.total_me);
        const localValue = Number(local.resumo.valor_pago_me_local);
        const summary: MunicipalitySummary = { id: municipality.codigo_ibge, tceCode: codigo_municipio, name: municipality.nome, region: municipality.uf, total, mpeValue, mpePercent: Number(payments.percentual_me ?? percent(mpeValue, total)), localValue, localPercent: Number(local.resumo.percentual_valor_pago_me_local ?? percent(localValue, total)), suppliers: local.resumo.fornecedores_me_locais, updatedAt: payments.coleta.finalizado_em ?? "", natures, meNatures, localNatures, localSuppliersByNature, collectionId: payments.coleta.coleta_id };
        localSupplierDocumentsCache.set(localSupplierDocumentsKey(year, summary), supplierDocuments);
        return summary;
      } catch { return null; }
    })).filter((row) => row !== null) as MunicipalitySummary[];
  })();
  municipalityCache.set(year, pending);
  pending.catch(() => municipalityCache.delete(year));
  return pending;
}

const sizeFromCategory = (category: string): SupplierSize => category === "MEI" ? "MEI" : category === "ME" ? "ME" : category === "EPP" ? "EPP" : "Demais empresas";
function supplierFromPayment(row: PaymentSupplier, summary: MunicipalitySummary, localDocuments: Set<string>): SupplierSummary {
  return { id: `${summary.id}:${row.documento}:${row.codigo_natureza}`, cnpj: row.documento, name: row.nome_negociante ?? "Fornecedor não identificado", size: sizeFromCategory(row.categoria_porte), classification: row.situacao_classificacao ?? "Classificação não informada", municipality: summary.name, municipalityId: summary.id, state: "CE", origin: localDocuments.has(row.documento.replace(/\D/g, "")) ? "Local" : "Sede não informada", total: Number(row.valor_pago), municipalitiesServed: 1, nature: row.codigo_natureza as NatureCode, updatedAt: "" };
}
export function getSupplierSummaries(summaries: MunicipalitySummary[], year: number): Promise<SupplierSummary[]> {
  const key = `${year}:${summaries.map((summary) => summary.id).sort().join(",")}`;
  const cached = supplierCache.get(key);
  if (cached) return cached;
  const pending = withConcurrency(summaries, 4, async (summary) => {
    const cachedLocalDocuments = localSupplierDocumentsCache.get(localSupplierDocumentsKey(year, summary));
    const [localDocuments, rows] = await Promise.all([
      cachedLocalDocuments
        ? Promise.resolve(cachedLocalDocuments)
        : listAllLocalPayments({ codigo_municipio: summary.tceCode, ano: year, coleta_id: summary.collectionId }).then((local) => new Set(local.data.map((row) => row.documento.replace(/\D/g, "")))),
      (async () => {
        const all: PaymentSupplier[] = [];
        for (let offset = 0; ; offset += 100) {
          const page = await listPaymentSuppliersService({ codigo_municipio: summary.tceCode, ano: year, coleta_id: summary.collectionId, categoria_porte: "", limit: 100, offset });
          if (page.offset !== offset || page.coleta_id !== summary.collectionId) throw new Error("A API retornou fornecedores fora da coleta solicitada.");
          all.push(...page.data);
          if (page.data.length < 100) return all;
        }
      })(),
    ]);
    const byDocument = new Map<string, SupplierSummary>();
    for (const row of rows) {
      const supplier = supplierFromPayment(row, summary, localDocuments);
      const current = byDocument.get(row.documento) ?? supplier;
      current.total += current === supplier ? 0 : supplier.total;
      if (current.nature !== supplier.nature) current.nature = "varias";
      byDocument.set(row.documento, current);
    }
    return [...byDocument.values()];
  }).then((pages) => {
    const byDocument = new Map<string, SupplierSummary>();
    for (const supplier of pages.flat()) {
      const current = byDocument.get(supplier.cnpj) ?? supplier;
      if (current !== supplier) {
        current.total += supplier.total;
        current.municipalitiesServed += 1;
        if (current.municipality !== supplier.municipality) current.municipality = "Vários municípios";
        current.municipalityId = "";
        current.origin = current.origin === "Local" && supplier.origin === "Local" ? "Local" : "Sede não informada";
        if (current.nature !== supplier.nature) current.nature = "varias";
      }
      byDocument.set(supplier.cnpj, current);
    }
    return [...byDocument.values()];
  });
  supplierCache.set(key, pending);
  pending.catch(() => supplierCache.delete(key));
  return pending;
}

export function getDashboardData(filters: GestorPublicFilters, allMunicipalities: MunicipalitySummary[], allSuppliers: SupplierSummary[] = []): DashboardData {
  const municipalitiesForNature = filters.nature
    ? allMunicipalities.map((municipality) => {
      const total = municipality.natures[filters.nature] ?? 0;
      const mpeValue = municipality.meNatures[filters.nature] ?? 0;
      const localValue = municipality.localNatures[filters.nature] ?? 0;
      return { ...municipality, total, mpeValue, mpePercent: percent(mpeValue, total), localValue, localPercent: percent(localValue, total) };
    })
    : allMunicipalities;
  const selected = filters.municipalities.length
    ? municipalitiesForNature.filter((municipality) => filters.municipalities.includes(municipality.id))
    : municipalitiesForNature;
  const rows = selected.length ? selected : municipalitiesForNature;
  const activeCodes = filters.nature ? [filters.nature] : [...new Set(rows.flatMap((row) => Object.keys(row.natures)))].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  const valueForNature = (row: MunicipalitySummary, code: NatureCode) => row.natures[code];
  const total = rows.reduce((sum, row) => sum + (filters.nature ? valueForNature(row, filters.nature) : row.total), 0);
  const mpeValue = rows.reduce((sum, row) => sum + (filters.nature ? row.meNatures[filters.nature] : row.mpeValue), 0);
  const localValue = rows.reduce((sum, row) => sum + (filters.nature ? row.localNatures[filters.nature] : row.localValue), 0);
  const suppliers = rows.reduce((sum, row) => sum + (filters.nature ? row.localSuppliersByNature[filters.nature] ?? 0 : row.suppliers), 0);
  const natures = activeCodes.map((code) => {
    const value = rows.reduce((sum, row) => sum + row.natures[code], 0);
    const ratio = rows.reduce((sum, row) => sum + row.meNatures[code], 0);
    return { code, label: natureLabels.get(code) ?? `Natureza ${code}`, value, mpeValue: ratio, mpePercent: percent(ratio, value) };
  });
  const suppliersRows = allSuppliers.filter((supplier) => rows.some((row) => row.id === supplier.municipalityId) && (!filters.nature || supplier.nature === filters.nature));
  const topMunicipalities = [...municipalitiesForNature].sort((a, b) => b.mpePercent - a.mpePercent).slice(0, 5);
  return {
    selected: rows,
    allMunicipalities: municipalitiesForNature,
    totals: { total, mpeValue, mpePercent: percent(mpeValue, total), localValue, suppliers, municipalities: rows.length },
    natures,
    topMunicipalities,
    suppliers: suppliersRows.sort((a, b) => b.total - a.total),
  };
}

export function natureName(code: string): string {
  if (code === "varias") return "Várias naturezas";
  return natureLabels.get(code) ?? `Natureza ${code}`;
}

export function getNatureOptions(summaries: MunicipalitySummary[]) {
  const codes = new Set(summaries.flatMap((row) => Object.keys(row.natures)));
  return [...codes].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true })).map((code) => ({ code, label: natureLabels.get(code) ?? `Natureza ${code}` }));
}
