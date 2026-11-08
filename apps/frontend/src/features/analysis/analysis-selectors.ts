import type { ExpensesByNatureResponse, ParticipationByNatureResponse } from "@/services/analytics/analytics.types";

export function selectAnalysisExpenses(data: ExpensesByNatureResponse["data"], natureCode?: string) {
  return data.filter((item) => !natureCode || item.codigo_natureza === natureCode)
    .sort((a, b) => Number(b.valor_total_dotacao) - Number(a.valor_total_dotacao));
}
export function selectAnalysisParticipation(data: ParticipationByNatureResponse["data"], natureCode?: string) {
  return data.filter((item) => !natureCode || item.codigo_natureza === natureCode);
}
export function selectAnalysisPercentages(data: ParticipationByNatureResponse["data"]) {
  return data.filter((item) => item.percentual_participacoes_me != null)
    .sort((a, b) => b.percentual_participacoes_me! - a.percentual_participacoes_me!);
}
