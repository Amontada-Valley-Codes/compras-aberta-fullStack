import { loadAnalysisData, type AnalysisData, type DataResult } from "@/features/public-data/public-data";
import { getPaymentsSummaryService, listPaymentSuppliersService } from "@/services/analytics/payments.service";
import type { PaymentSupplier, PaymentsSummaryResponse } from "@/services/analytics/payments.types";

export const DETAIL_YEARS = [2026, 2025, 2024];
export interface MunicipalityDetailData {
  analysis: AnalysisData;
  suppliers: DataResult<PaymentSupplier[]>;
  history: Array<{ year: number; payments: DataResult<PaymentsSummaryResponse> }>;
}
async function result<T>(load: Promise<T>): Promise<DataResult<T>> {
  try { return { data: await load, error: null }; }
  catch { return { data: null, error: "Não foi possível consultar esta informação na API de pagamentos." }; }
}
async function allSuppliers(analysis: AnalysisData): Promise<PaymentSupplier[]> {
  if (!analysis.suppliers.data || !analysis.payments.data || !analysis.selectedMunicipality) throw new Error("Listagem indisponível");
  const collectionId = analysis.payments.data.coleta.coleta_id;
  if (analysis.suppliers.data.coleta_id !== collectionId) throw new Error("Coletas diferentes");
  const rows = [...analysis.suppliers.data.data];
  let length = rows.length;
  while (length === 100) {
    const page = await listPaymentSuppliersService({ codigo_municipio: analysis.selectedMunicipality.tceCode.padStart(3, "0"), ano: analysis.filters.year, coleta_id: collectionId, categoria_porte: "", limit: 100, offset: rows.length });
    if (page.coleta_id !== collectionId || page.offset !== rows.length) throw new Error("Página ou coleta divergente durante a consulta");
    rows.push(...page.data);
    length = page.data.length;
  }
  return rows;
}
export async function loadMunicipalityDetailData(id: string, year: number): Promise<MunicipalityDetailData> {
  // Categoria vazia é a regra documentada para consultar todos os portes.
  const analysis = await loadAnalysisData({ municipalityIbge: id, year, page: 1, pageSize: 100 }, "");
  const municipality = analysis.selectedMunicipality;
  if (!municipality) return { analysis, suppliers: { data: null, error: "Município não disponível no catálogo da API." }, history: [] };
  const codigo_municipio = municipality.tceCode.padStart(3, "0");
  const [suppliers, history] = await Promise.all([
    result(allSuppliers(analysis)),
    Promise.all(DETAIL_YEARS.map(async (historyYear) => ({ year: historyYear, payments: historyYear === year ? analysis.payments : await result(getPaymentsSummaryService({ codigo_municipio, ano: historyYear })) }))),
  ]);
  return { analysis, suppliers, history };
}
