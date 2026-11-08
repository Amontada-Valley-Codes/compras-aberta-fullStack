"use client";

import dynamic from "next/dynamic";
import { BarChart3, SearchX, Table2 } from "lucide-react";
import { useMemo, useState } from "react";
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
const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

function ChartEmptyState({ children }: { children: string }) {
  return <div className="analysis-data-state" role="status"><SearchX aria-hidden="true" /><strong>Nenhum dado encontrado</strong><span>{children}</span></div>;
}

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

function ChartViewControls({ table, onTableChange }: { table: boolean; onTableChange: (value: boolean) => void }) {
  return <div className="analysis-chart-controls" role="group" aria-label="Opções do gráfico">
    <button type="button" className={!table ? "is-active" : ""} onClick={() => onTableChange(false)} aria-label="Ver gráfico" aria-pressed={!table}><BarChart3 size={15} /> <span>Gráfico</span></button>
    <button type="button" className={table ? "is-active" : ""} onClick={() => onTableChange(true)} aria-label="Ver tabela" aria-pressed={table}><Table2 size={15} /> <span>Tabela</span></button>
  </div>;
}

function ChartTable({ labels, values, valueFormatter }: { labels: string[]; values: number[]; valueFormatter: (value: number) => string }) {
  return <div className="analysis-chart-table-wrap"><table className="analysis-chart-table"><thead><tr><th>Natureza da despesa</th><th>Valor</th></tr></thead><tbody>{labels.map((label, index) => <tr key={`${label}-${index}`}><td>{label}</td><td>{valueFormatter(values[index] ?? 0)}</td></tr>)}</tbody></table></div>;
}

export function NatureBarChart({ id, color, seriesName, labels, values, axisFormatter, tooltipFormatter, compactView = false }: NatureBarChartProps) {
  const [table, setTable] = useState(false);
  const sorted = useMemo(() => labels.map((label, index) => ({ label, value: Number(values[index] ?? 0) })), [labels, values]);
  const sortedLabels = sorted.map((item) => item.label);
  const sortedValues = sorted.map((item) => item.value);
  const options: ApexOptions = {
    ...base,
    chart: { ...base.chart, id, type: "bar" },
    colors: [color],
    plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: "58%" } },
    xaxis: {
      categories: sortedLabels.map((label) => wrapLabel(label)),
      tickAmount: compactView ? 3 : 4,
      labels: { formatter: (value) => axisFormatter(Number(value)), style: { colors: "#3D586D", fontSize: compactView ? "10px" : "12px" } },
    },
    yaxis: { labels: { maxWidth: compactView ? 110 : 170, style: { colors: colors.graphite, fontSize: compactView ? "10px" : "13px" } } },
    tooltip: {
      shared: true,
      intersect: false,
      x: { formatter: (_value, opts) => sortedLabels[opts?.dataPointIndex ?? 0] ?? "" },
      y: { formatter: tooltipFormatter },
    },
  };
  const height = compactView ? 130 : Math.max(230, 60 + labels.length * 46);
  return <>
    <ChartViewControls table={table} onTableChange={setTable} />
    {table ? <ChartTable labels={sortedLabels} values={sortedValues} valueFormatter={tooltipFormatter} /> : <Chart type="bar" height={height} options={options} series={[{ name: seriesName, data: sortedValues }]} />}
  </>;
}

const percentLabel = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export function ExpensesChart({ data, compactView = false }: { data: ExpensesByNatureResponse["data"]; compactView?: boolean }) {
  const allRows = selectExpenseRows(data);
  const rows = compactView ? allRows.slice(0, 4) : allRows;
  if (!rows.length) return <ChartEmptyState>Nenhum valor previsto no orçamento para estes filtros.</ChartEmptyState>;
  return <NatureBarChart
    id="export-expenses-chart"
    color={chartColors.expenses}
    seriesName="Dotação prevista"
    labels={rows.map((item) => natureLabel(item.codigo_natureza, item.nome_natureza))}
    values={rows.map((item) => Number(item.valor_total_dotacao))}
    axisFormatter={compact}
    tooltipFormatter={(value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)}
    compactView={compactView}
  />;
}

export function ParticipationChart({ data, compactView = false }: { data: ParticipationByNatureResponse["data"]; compactView?: boolean }) {
  const rows = selectParticipationRows(data, compactView);
  if (!rows.length) return <ChartEmptyState>Nenhuma microempresa participou de licitações com estes filtros.</ChartEmptyState>;
  return <NatureBarChart
    id="export-participation-chart"
    color={chartColors.participation}
    seriesName="Participação de ME"
    labels={rows.map((item) => natureLabel(item.codigo_natureza, item.nome_natureza))}
    values={rows.map((item) => item.percentual_participacoes_me ?? 0)}
    axisFormatter={(value) => `${Math.round(value)}%`}
    tooltipFormatter={(value) => `${percentLabel(value)} das participações`}
    compactView={compactView}
  />;
}

export function MicroenterpriseValueChart({ data }: { data: ParticipationByNatureResponse["data"] }) {
  const rows = selectMicroenterpriseValueRows(data);
    if (!rows.length) return <ChartEmptyState>Nenhum valor homologado para microempresas nestes filtros.</ChartEmptyState>;
  return <NatureBarChart
    id="export-microenterprise-chart"
    color={chartColors.microenterprise}
    seriesName="Valor homologado para ME"
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

export function ShareDonutChart({
  percentage, size, chartId, meLabel, othersLabel, meColor, othersColor,
  meMarkerClass, othersMarkerClass, centerLabel, ariaLabel,
}: ShareDonutChartProps) {
  const [table, setTable] = useState(false);
  const numericPercentage = Number(percentage);
  const safe = Number.isFinite(numericPercentage) ? Math.min(100, Math.max(0, numericPercentage)) : 0;
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
  return <div className="analysis-share-chart-wrap">
    <ChartViewControls table={table} onTableChange={setTable} />
    {table ? <ChartTable labels={[meLabel, othersLabel]} values={[safe, 100 - safe]} valueFormatter={percentLabel} /> : <div className="local-share-chart" style={{ width: size, height: size }} role="img" aria-label={ariaLabel}>
      <Chart type="donut" height={size} options={options} series={[safe, 100 - safe]} />
      <span className="local-share-center"><b>{label}</b><small>{centerLabel}</small></span>
    </div>}
  </div>;
}

export function LocalShareChart({ percentage, size = 210 }: { percentage: number; size?: number }) {
  return (
    <ShareDonutChart
      percentage={percentage}
      size={size}
      chartId="export-local-share-chart"
      meLabel="Compras com ME locais"
      othersLabel="Outras empresas"
      meColor={chartColors.local}
      othersColor={chartColors.remaining}
      meMarkerClass="local-share-tooltip-marker--me"
      othersMarkerClass="local-share-tooltip-marker--others"
      centerLabel="compras com ME locais"
      ariaLabel={`${percentage.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% das compras ficaram com microempresas locais`}
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
      meLabel="Compras com ME"
      othersLabel="Outras empresas"
      meColor={chartColors.general}
      othersColor={chartColors.generalRemaining}
      meMarkerClass="local-share-tooltip-marker--general-me"
      othersMarkerClass="local-share-tooltip-marker--general-others"
      centerLabel="compras com ME"
      ariaLabel={`${percentage.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% das compras ficaram com microempresas, de qualquer cidade`}
    />
  );
}
