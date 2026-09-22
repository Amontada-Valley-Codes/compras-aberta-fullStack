import type { ExpensesByNatureResponse, ParticipationByNatureResponse } from "@/services/analytics/analytics.types";

// Sem "use client": estas funções são puras e precisam ser chamáveis tanto
// pelos gráficos (client component, em PublicCharts.tsx) quanto pela página
// de análise (server component, em features/analysis/MunicipalityAnalysisPage.tsx)
// ao montar o resumo usado na exportação em PDF. Um módulo marcado "use
// client" não pode ter suas funções chamadas a partir do servidor, mesmo
// quando são puras — daí viverem num arquivo à parte.
export function selectPositiveExpenses(data: ExpensesByNatureResponse["data"]) {
  return data.filter((item) => Number(item.valor_total_dotacao) > 0);
}

export function selectParticipationRows(data: ParticipationByNatureResponse["data"], compactView = false) {
  return [...data]
    .filter((item) => (item.percentual_participacoes_me ?? 0) > 0)
    .sort((a, b) => (b.percentual_participacoes_me ?? 0) - (a.percentual_participacoes_me ?? 0))
    .slice(0, compactView ? 4 : 8);
}

export function selectMicroenterpriseValueRows(data: ParticipationByNatureResponse["data"]) {
  return [...data]
    .filter((item) => Number(item.valor_vencido_me) > 0)
    .sort((a, b) => Number(b.valor_vencido_me) - Number(a.valor_vencido_me))
    .slice(0, 8);
}
