"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { brandTokens } from "@/design-system/tokens";
import type { ExpensesByNatureResponse, ParticipationByNatureResponse } from "@/services/analytics/analytics.types";
import { selectMicroenterpriseValueRows, selectParticipationRows, selectPositiveExpenses } from "./chart-selectors";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
const colors = brandTokens.colors;
const chartColors = {
  expenses: "#1F76C2",
  participation: "#0BA7B3",
  microenterprise: "#185A98",
  local: "#E5A629",
  remaining: "#7FB5D7",
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

export function ExpensesChart({ data, compactView = false }: { data: ExpensesByNatureResponse["data"]; compactView?: boolean }) {
  const positiveRows = selectPositiveExpenses(data);
  const rows = compactView ? [...positiveRows].sort((a, b) => Number(b.valor_total_dotacao) - Number(a.valor_total_dotacao)).slice(0, 4) : positiveRows;
  if (!rows.length) return <p className="analysis-data-state">Nenhuma dotação com valor positivo para estes filtros.</p>;
  const options: ApexOptions = {
    ...base,
    chart: { ...base.chart, id: "export-expenses-chart", type: "bar" },
    colors: [chartColors.expenses],
    plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: "50%" } },
    xaxis: {
      categories: rows.map((item) => item.nome_natureza),
      tickAmount: 3,
      labels: { formatter: compact, style: { colors: "#3D586D", fontSize: compactView ? "10px" : "12px" } },
    },
    yaxis: { labels: { maxWidth: compactView ? 95 : 180, style: { colors: colors.graphite, fontSize: compactView ? "10px" : "12px" } } },
    tooltip: { shared: true, intersect: false, y: { formatter: (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value) } },
  };
  return <Chart type="bar" height={compactView ? 130 : 350} options={options} series={[{ name: "Valor de dotações", data: rows.map((item) => Number(item.valor_total_dotacao)) }]} />;
}

export function ParticipationChart({ data, compactView = false }: { data: ParticipationByNatureResponse["data"]; compactView?: boolean }) {
  const rows = selectParticipationRows(data, compactView);
  if (!rows.length) return <p className="analysis-data-state">Nenhuma participação de ME acima de 0% para estes filtros.</p>;
  const names = new Map(rows.map((item) => [item.codigo_natureza, item.nome_natureza]));
  const options: ApexOptions = {
    ...base,
    chart: { ...base.chart, id: "export-participation-chart", type: "bar" },
    colors: [chartColors.participation],
    plotOptions: { bar: { horizontal: false, borderRadius: 7, columnWidth: "54%" } },
    xaxis: { categories: rows.map((item) => item.codigo_natureza), labels: { style: { colors: colors.graphite, fontSize: "12px", fontWeight: 700 } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: 0, max: 100, tickAmount: 4, labels: { formatter: (value) => `${value}%`, style: { colors: "#3D586D", fontSize: "12px" } } },
    tooltip: { shared: true, intersect: false, x: { formatter: (code) => names.get(String(code)) ?? String(code) }, y: { formatter: (value) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% das participações` } },
  };
  return <div className="nature-chart"><Chart type="bar" height={compactView ? 215 : 285} options={options} series={[{ name: "Participação de ME", data: rows.map((item) => item.percentual_participacoes_me ?? 0) }]} /><NatureKey rows={rows} /></div>;
}

export function MicroenterpriseValueChart({ data }: { data: ParticipationByNatureResponse["data"] }) {
  const rows = selectMicroenterpriseValueRows(data);
  if (!rows.length) return <p className="analysis-data-state">Nenhum valor vencido por ME para estes filtros.</p>;
  const names = new Map(rows.map((item) => [item.codigo_natureza, item.nome_natureza]));
  const options: ApexOptions = {
    ...base,
    chart: { ...base.chart, id: "export-microenterprise-chart", type: "bar" },
    colors: [chartColors.microenterprise],
    plotOptions: { bar: { horizontal: false, borderRadius: 7, columnWidth: "54%" } },
    xaxis: { categories: rows.map((item) => item.codigo_natureza), labels: { style: { colors: colors.graphite, fontSize: "12px", fontWeight: 700 } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: 0, labels: { formatter: compact, style: { colors: "#3D586D", fontSize: "12px" } } },
    tooltip: { shared: true, intersect: false, x: { formatter: (code) => names.get(String(code)) ?? String(code) }, y: { formatter: currency } },
  };
  return <div className="nature-chart"><Chart type="bar" height={285} options={options} series={[{ name: "Valor vencido por ME", data: rows.map((item) => Number(item.valor_vencido_me)) }]} /><NatureKey rows={rows} /></div>;
}

function NatureKey({ rows }: { rows: Array<{ codigo_natureza: string; nome_natureza: string }> }) {
  return <div className="nature-chart-key" aria-label="Legenda das naturezas da despesa">
    {rows.map((item) => <span key={item.codigo_natureza} title={item.nome_natureza}><b>{item.codigo_natureza}</b>{item.nome_natureza.toLocaleLowerCase("pt-BR")}</span>)}
  </div>;
}

export function LocalShareChart({ percentage, size = 210 }: { percentage: number; size?: number }) {
  const safe = Math.min(100, Math.max(0, percentage));
  const label = `${safe.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  const options: ApexOptions = {
    ...base,
    chart: { ...base.chart, id: "export-local-share-chart", type: "donut" },
    labels: ["ME locais", "Demais fornecedores"],
    colors: [chartColors.local, chartColors.remaining],
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
        title.textContent = index === 0 ? "ME LOCAIS" : "DEMAIS FORNECEDORES";

        const detail = document.createElement("div");
        detail.className = "local-share-tooltip-detail";
        const marker = document.createElement("span");
        marker.className = `local-share-tooltip-marker local-share-tooltip-marker--${index === 0 ? "me" : "others"}`;
        const label = document.createElement("span");
        label.textContent = "Participação: ";
        const value = document.createElement("strong");
        value.textContent = `${(index === 0 ? safe : 100 - safe).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
        detail.append(marker, label, value);
        tooltip.append(title, detail);
        return tooltip;
      },
    },
  };
  return <div className="local-share-chart" style={{ width: size, height: size }} role="img" aria-label={`${label} do valor vencido por microempresas locais`}>
    <Chart type="donut" height={size} options={options} series={[safe, 100 - safe]} />
    <span className="local-share-center"><b>{label}</b><small>ME locais</small></span>
  </div>;
}
