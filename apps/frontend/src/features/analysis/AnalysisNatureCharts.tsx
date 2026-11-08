"use client";

import type { ExpensesByNatureResponse, ParticipationByNatureResponse } from "@/services/analytics/analytics.types";
import { NatureBarChart } from "@/features/public-data/PublicCharts";
import { money, percent } from "@/features/public-data/format";
import { natureLabel } from "@/features/public-data/plain-language";
import { selectAnalysisExpenses, selectAnalysisPercentages } from "./analysis-selectors";

const compact = (value: number) => new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);

export function AnalysisExpensesChart({ data }: { data: ExpensesByNatureResponse["data"] }) {
  const rows = selectAnalysisExpenses(data);
  return <NatureBarChart id="export-expenses-chart" color="#1F76C2" seriesName="Dotação prevista"
    labels={rows.map((item) => natureLabel(item.codigo_natureza, item.nome_natureza))}
    values={rows.map((item) => Number(item.valor_total_dotacao))} axisFormatter={compact} tooltipFormatter={money} />;
}

export function AnalysisParticipationChart({ data }: { data: ParticipationByNatureResponse["data"] }) {
  const rows = selectAnalysisPercentages(data);
  if (!rows.length) return <p className="analysis-data-state">Sem base para calcular os percentuais de participações vencedoras.</p>;
  return <NatureBarChart id="export-participation-chart" color="#0BA7B3" seriesName="Participação de ME"
    labels={rows.map((item) => natureLabel(item.codigo_natureza, item.nome_natureza))}
    values={rows.map((item) => item.percentual_participacoes_me!)}
    axisFormatter={(value) => `${Math.round(value)}%`} tooltipFormatter={percent} />;
}

export function AnalysisMicroValueChart({ data }: { data: ParticipationByNatureResponse["data"] }) {
  const rows = [...data].sort((a, b) => Number(b.valor_vencido_me) - Number(a.valor_vencido_me));
  return <NatureBarChart id="export-microenterprise-chart" color="#185A98" seriesName="Valor de compra para ME"
    labels={rows.map((item) => natureLabel(item.codigo_natureza, item.nome_natureza))}
    values={rows.map((item) => Number(item.valor_vencido_me))} axisFormatter={compact} tooltipFormatter={money} />;
}
