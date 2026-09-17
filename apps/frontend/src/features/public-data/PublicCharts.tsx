"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { brandTokens } from "@/design-system/tokens";
import type { ExpensesByNatureResponse, ParticipationByNatureResponse } from "@/services/analytics/analytics.types";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
const colors = brandTokens.colors;
const compact = (value: number) => new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

const base: ApexOptions = {
  chart: { toolbar: { show: false }, fontFamily: `${brandTokens.typography.family}, sans-serif` },
  dataLabels: { enabled: false },
  grid: { borderColor: "#DCE6EC", strokeDashArray: 4 },
  tooltip: { theme: "light" },
  noData: { text: "Sem dados para os filtros selecionados" },
};

export function ExpensesChart({ data, compactView = false }: { data: ExpensesByNatureResponse["data"]; compactView?: boolean }) {
  const rows = compactView ? [...data].sort((a, b) => Number(b.valor_total_dotacao) - Number(a.valor_total_dotacao)).slice(0, 4) : data;
  const options: ApexOptions = {
    ...base,
    chart: { ...base.chart, type: "bar" },
    colors: [colors.primary],
    plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: "50%" } },
    xaxis: {
      categories: rows.map((item) => item.nome_natureza),
      tickAmount: 3,
      labels: { formatter: compact, style: { colors: "#60717C" } },
    },
    yaxis: { labels: { maxWidth: compactView ? 95 : 180, style: { colors: colors.graphite, fontSize: compactView ? "9px" : "11px" } } },
    tooltip: { y: { formatter: (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value) } },
  };
  return <Chart type="bar" height={compactView ? 130 : 350} options={options} series={[{ name: "Valor de dotações", data: rows.map((item) => Number(item.valor_total_dotacao)) }]} />;
}

export function ParticipationChart({ data, compactView = false }: { data: ParticipationByNatureResponse["data"]; compactView?: boolean }) {
  const rows = [...data]
    .sort((a, b) => (b.percentual_participacoes_me ?? 0) - (a.percentual_participacoes_me ?? 0))
    .slice(0, compactView ? 4 : 8);
  const names = new Map(rows.map((item) => [item.codigo_natureza, item.nome_natureza]));
  const options: ApexOptions = {
    ...base,
    chart: { ...base.chart, type: "bar" },
    colors: [colors.opportunity],
    plotOptions: { bar: { horizontal: false, borderRadius: 7, columnWidth: "54%" } },
    fill: { type: "gradient", gradient: { shade: "light", type: "vertical", shadeIntensity: 0.15, opacityFrom: 1, opacityTo: 0.78 } },
    xaxis: { categories: rows.map((item) => item.codigo_natureza), labels: { style: { colors: colors.graphite, fontSize: "11px", fontWeight: 700 } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: 0, max: 100, tickAmount: 4, labels: { formatter: (value) => `${value}%`, style: { colors: "#60717C" } } },
    tooltip: { x: { formatter: (code) => names.get(String(code)) ?? String(code) }, y: { formatter: (value) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% das participações` } },
  };
  return <div className="nature-chart"><Chart type="bar" height={compactView ? 215 : 285} options={options} series={[{ name: "Participação de ME", data: rows.map((item) => item.percentual_participacoes_me ?? 0) }]} /><NatureKey rows={rows} /></div>;
}

export function MicroenterpriseValueChart({ data }: { data: ParticipationByNatureResponse["data"] }) {
  const rows = [...data].sort((a, b) => Number(b.valor_vencido_me) - Number(a.valor_vencido_me)).slice(0, 8);
  if (!rows.length) return <p className="analysis-data-state">Nenhum valor vencido por ME para estes filtros.</p>;
  const names = new Map(rows.map((item) => [item.codigo_natureza, item.nome_natureza]));
  const options: ApexOptions = {
    ...base,
    chart: { ...base.chart, type: "bar" },
    colors: [colors.institutional],
    plotOptions: { bar: { horizontal: false, borderRadius: 7, columnWidth: "54%" } },
    fill: { type: "gradient", gradient: { shade: "light", type: "vertical", shadeIntensity: 0.18, opacityFrom: 1, opacityTo: 0.76 } },
    xaxis: { categories: rows.map((item) => item.codigo_natureza), labels: { style: { colors: colors.graphite, fontSize: "11px", fontWeight: 700 } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: 0, labels: { formatter: compact, style: { colors: "#60717C" } } },
    tooltip: { x: { formatter: (code) => names.get(String(code)) ?? String(code) }, y: { formatter: currency } },
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
    chart: { ...base.chart, type: "donut" },
    labels: ["ME locais", "Demais fornecedores"],
    colors: [colors.primary, "#D8E3EA"],
    stroke: { colors: [colors.white], width: 3 },
    legend: { show: false },
    plotOptions: { pie: { donut: { size: "73%", labels: { show: false } } } },
    tooltip: { y: { formatter: (value) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%` } },
  };
  return <div className="local-share-chart" style={{ width: size, height: size }} role="img" aria-label={`${label} do valor vencido por microempresas locais`}>
    <Chart type="donut" height={size} options={options} series={[safe, 100 - safe]} />
    <span className="local-share-center"><b>{label}</b><small>ME locais</small></span>
  </div>;
}
