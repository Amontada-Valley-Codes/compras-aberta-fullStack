import { loadAnalysisData, type AnalysisData, type DataResult } from "@/features/public-data/public-data";
import { listExpensesByNatureService } from "@/services/analytics/list-expenses-by-nature.service";
import { listGeneralParticipationsService } from "@/services/analytics/list-general-participations.service";
import { getPaymentsSummaryService } from "@/services/analytics/payments.service";
import type { ExpensesByNatureResponse, LocalParticipation } from "@/services/analytics/analytics.types";
import type { PaymentsSummaryResponse } from "@/services/analytics/payments.types";

export const DETAIL_YEARS = [2026, 2025, 2024];
export interface MunicipalityDetailData {
  analysis: AnalysisData;
  winners: DataResult<LocalParticipation[]>;
  history: Array<{ year: number; expenses: DataResult<ExpensesByNatureResponse>; payments: DataResult<PaymentsSummaryResponse> }>;
}
async function result<T>(load: Promise<T>): Promise<DataResult<T>> {
  try { return { data: await load, error: null }; }
  catch { return { data: null, error: "Não foi possível consultar esta informação na API de dados." }; }
}
async function allWinners(analysis: AnalysisData): Promise<LocalParticipation[]> {
  if (!analysis.bids.data || !analysis.selectedMunicipality) throw new Error("Listagem indisponível");
  const first = analysis.bids.data;
  const rows = [...first.data];
  const expected = first.resumo.participacoes_me;
  while (rows.length < expected) {
    const page = await listGeneralParticipationsService({ codigo_municipio: analysis.selectedMunicipality.tceCode.padStart(3, "0"), ano: analysis.filters.year, limit: 100, offset: rows.length });
    if (!page.data.length) throw new Error("Listagem incompleta");
    rows.push(...page.data);
  }
  if (rows.length !== expected) throw new Error("Listagem mudou durante a consulta");
  return rows;
}
export async function loadMunicipalityDetailData(id: string, year: number): Promise<MunicipalityDetailData> {
  const analysis = await loadAnalysisData({ municipalityIbge: id, year, page: 1, pageSize: 100 });
  const municipality = analysis.selectedMunicipality;
  if (!municipality) return { analysis, winners: { data: null, error: "Município não disponível no catálogo da API." }, history: [] };
  const codigo_municipio = municipality.tceCode.padStart(3, "0");
  const [winners, history] = await Promise.all([
    result(allWinners(analysis)),
    Promise.all(DETAIL_YEARS.map(async (historyYear) => {
      const [expenses, payments] = await Promise.all([
        historyYear === year ? Promise.resolve(analysis.expenses) : result(listExpensesByNatureService({ codigo_municipio, data_inicio: `${historyYear}-01-01`, data_fim: `${historyYear}-12-31` })),
        result(getPaymentsSummaryService({ codigo_municipio, ano: historyYear })),
      ]);
      return { year: historyYear, expenses, payments };
    })),
  ]);
  return { analysis, winners, history };
}
