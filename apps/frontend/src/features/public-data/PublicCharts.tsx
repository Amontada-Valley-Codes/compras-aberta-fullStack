"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { brandTokens } from "@/design-system/tokens";
import type { ExpensesByNatureResponse, ParticipationByNatureResponse } from "@/services/analytics/analytics.types";
import { selectExpenseRows, selectMicroenterpriseValueRows, selectParticipationRows } from "./chart-selectors";
import { natureLabel } from "./plain-language";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
const colors = brandTokens.colors;
const chartColors = {
  expenses: "#1F76C2",
  participation: "#0BA7B3",
  microenterprise: "#185A98",
  local: "#E5A629",
  remaining: "#7FB5D7",
  general: "#185A98",
  generalRemaining: "#B9CEDD",
};
const compact = (value: number) => new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

const base: ApexOptions = {
  chart: { toolbar: { show: false }, fontFamily: `${brandTokens.typography.family}, sans-serif` },
  dataLabels: { enabled: false },
  fill: { opacity: 1 },
  grid: { borderColor: "#D6E4EF", strokeDashArray: 4 },
  tooltip: { theme: "light" },
  noData: { text: "Sem dados para os filtros selecionados" },
};

// Quebra nomes longos em duas linhas no eixo, em vez de deixar o ApexCharts
// cortar com "…" (ex.: "Itens distribuídos / à população").
function wrapLabel(label: string, maxLine = 20): string[] {
  if (label.length <= maxLine) return [label];
  const middle = label.length / 2;
  let breakAt = -1;
  for (let index = label.indexOf(" "); index !== -1; index = label.indexOf(" ", index + 1)) {
    if (breakAt === -1 || Math.abs(index - middle) < Math.abs(breakAt - middle)) breakAt = index;
  }
  return breakAt === -1 ? [label] : [label.slice(0, breakAt), label.slice(breakAt + 1)];
}

interface NatureBarChartProps {
  id: string;
  color: string;
  seriesName: string;
  labels: string[];
  values: number[];
  axisFormatter: (value: number) => string;
  tooltipFormatter: (value: number) => string;
  compactView?: boolean;
}

function NatureBarChart({ id, color, seriesName, labels, values, axisFormatter, tooltipFormatter, compactView = false }: NatureBarChartProps) {
  const options: ApexOptions = {
    ...base,
    chart: { ...base.chart, id, type: "bar" },
    colors: [color],
    plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: "58%" } },
    xaxis: {
      categories: labels.map((label) => wrapLabel(label)),
      tickAmount: compactView ? 3 : 4,
      labels: { formatter: (value) => axisFormatter(Number(value)), style: { colors: "#3D586D", fontSize: compactView ? "10px" : "12px" } },
    },
    yaxis: { labels: { maxWidth: compactView ? 110 : 170, style: { colors: colors.graphite, fontSize: compactView ? "10px" : "13px" } } },
    tooltip: {
      shared: true,
      intersect: false,
      x: { formatter: (_value, opts) => labels[opts?.dataPointIndex ?? 0] ?? "" },
      y: { formatter: tooltipFormatter },
    },
  };
  const height = compactView ? 130 : Math.max(230, 60 + labels.length * 46);
  return <Chart type="bar" height={height} options={options} series={[{ name: seriesName, data: values }]} />;
}

const percentLabel = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export function ExpensesChart({ data, compactView = false }: { data: ExpensesByNatureResponse["data"]; compactView?: boolean }) {
  const allRows = selectExpenseRows(data);
  const rows = compactView ? allRows.slice(0, 4) : allRows;
  if (!rows.length) return <p className="analysis-data-state">Nenhum valor previsto no orçamento para estes filtros.</p>;
  return <NatureBarChart
    id="export-expenses-chart"
    color={chartColors.expenses}
    seriesName="Orçamento previsto"
    labels={rows.map((item) => natureLabel(item.codigo_natureza, item.nome_natureza))}
    values={rows.map((item) => Number(item.valor_total_dotacao))}
    axisFormatter={compact}
    tooltipFormatter={(value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)}
    compactView={compactView}
  />;
}

export function ParticipationChart({ data, compactView = false }: { data: ParticipationByNatureResponse["data"]; compactView?: boolean }) {
  const rows = selectParticipationRows(data, compactView);
  if (!rows.length) return <p className="analysis-data-state">Nenhuma microempresa participou de licitações com estes filtros.</p>;
  return <NatureBarChart
    id="export-participation-chart"
    color={chartColors.participation}
    seriesName="Participações de microempresas"
    labels={rows.map((item) => natureLabel(item.codigo_natureza, item.nome_natureza))}
    values={rows.map((item) => item.percentual_participacoes_me ?? 0)}
    axisFormatter={(value) => `${Math.round(value)}%`}
    tooltipFormatter={(value) => `${percentLabel(value)} das participações`}
    compactView={compactView}
  />;
}

export function MicroenterpriseValueChart({ data }: { data: ParticipationByNatureResponse["data"] }) {
  const rows = selectMicroenterpriseValueRows(data);
  if (!rows.length) return <p className="analysis-data-state">Nenhum valor ganho por microempresas para estes filtros.</p>;
  return <NatureBarChart
    id="export-microenterprise-chart"
    color={chartColors.microenterprise}
    seriesName="Valor ganho por microempresas"
    labels={rows.map((item) => natureLabel(item.codigo_natureza, item.nome_natureza))}
    values={rows.map((item) => Number(item.valor_vencido_me))}
    axisFormatter={compact}
    tooltipFormatter={currency}
  />;
}

interface ShareDonutChartProps {
  percentage: number;
  size: number;
  chartId: string;
  meLabel: string;
  othersLabel: string;
  meColor: string;
  othersColor: string;
  meMarkerClass: string;
  othersMarkerClass: string;
  centerLabel: string;
  ariaLabel: string;
}

function ShareDonutChart({
  percentage, size, chartId, meLabel, othersLabel, meColor, othersColor,
  meMarkerClass, othersMarkerClass, centerLabel, ariaLabel,
}: ShareDonutChartProps) {
  const safe = Math.min(100, Math.max(0, percentage));
  const label = `${safe.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  const options: ApexOptions = {
    ...base,
    chart: { ...base.chart, id: chartId, type: "donut" },
    labels: [meLabel, othersLabel],
    colors: [meColor, othersColor],
    stroke: { colors: [colors.white], width: 2 },
    legend: { show: false },
    plotOptions: { pie: { donut: { size: "73%", labels: { show: false } } } },
    tooltip: {
      theme: "light",
      fillSeriesColor: false,
      fixed: { enabled: true, position: "topRight", offsetX: 0, offsetY: 0 },
      custom: ({ seriesIndex }) => {
        const index = seriesIndex === 0 ? 0 : 1;
        const tooltip = document.createElement("div");
        tooltip.className = "local-share-tooltip";

        const title = document.createElement("div");
        title.className = "local-share-tooltip-title";
        title.textContent = (index === 0 ? meLabel : othersLabel).toUpperCase();

        const detail = document.createElement("div");
        detail.className = "local-share-tooltip-detail";
        const marker = document.createElement("span");
        marker.className = `local-share-tooltip-marker ${index === 0 ? meMarkerClass : othersMarkerClass}`;
        const labelSpan = document.createElement("span");
        labelSpan.textContent = "Fatia do valor: ";
        const value = document.createElement("strong");
        value.textContent = `${(index === 0 ? safe : 100 - safe).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
        detail.append(marker, labelSpan, value);
        tooltip.append(title, detail);
        return tooltip;
      },
    },
  };
  return <div className="local-share-chart" style={{ width: size, height: size }} role="img" aria-label={ariaLabel}>
    <Chart type="donut" height={size} options={options} series={[safe, 100 - safe]} />
    <span className="local-share-center"><b>{label}</b><small>{centerLabel}</small></span>
  </div>;
}

export function LocalShareChart({ percentage, size = 210 }: { percentage: number; size?: number }) {
  return (
    <ShareDonutChart
      percentage={percentage}
      size={size}
      chartId="export-local-share-chart"
      meLabel="Microempresas locais"
      othersLabel="Outras empresas"
      meColor={chartColors.local}
      othersColor={chartColors.remaining}
      meMarkerClass="local-share-tooltip-marker--me"
      othersMarkerClass="local-share-tooltip-marker--others"
      centerLabel="microempresas locais"
      ariaLabel={`${percentage.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% do valor ganho ficou com microempresas locais`}
    />
  );
}

// Mesma peça visual do LocalShareChart, mas para a base "geral": todas as
// microempresas vencedoras no município, de qualquer cidade (não só as sediadas ali).
export function GeneralShareChart({ percentage, size = 210 }: { percentage: number; size?: number }) {
  return (
    <ShareDonutChart
      percentage={percentage}
      size={size}
      chartId="export-general-share-chart"
      meLabel="Microempresas"
      othersLabel="Outras empresas"
      meColor={chartColors.general}
      othersColor={chartColors.generalRemaining}
      meMarkerClass="local-share-tooltip-marker--general-me"
      othersMarkerClass="local-share-tooltip-marker--general-others"
      centerLabel="microempresas"
      ariaLabel={`${percentage.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% do valor ganho ficou com microempresas, de qualquer cidade`}
    />
  );
}
