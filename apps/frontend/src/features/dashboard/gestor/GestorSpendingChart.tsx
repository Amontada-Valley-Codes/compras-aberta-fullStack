"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { selectExpenseRows } from "@/features/public-data/chart-selectors";
import { compactMoney, money } from "@/features/public-data/format";
import { natureLabel } from "@/features/public-data/plain-language";
import type { ExpensesByNatureResponse } from "@/services/analytics/analytics.types";

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => <div className="ov-chart-placeholder" aria-hidden="true" />,
});

// O maior gasto em azul-marinho; os demais em tons mais claros.
const TOP_COLOR = "#11169B";
const OTHER_COLOR = "#5B9BD5";

// Quebra nomes longos em duas linhas no eixo em vez de deixar o Apex cortar.
function wrapLabel(label: string, maxLine = 24): string[] {
  if (label.length <= maxLine) return [label];
  const middle = label.length / 2;
  let breakAt = -1;
  for (let index = label.indexOf(" "); index !== -1; index = label.indexOf(" ", index + 1)) {
    if (breakAt === -1 || Math.abs(index - middle) < Math.abs(breakAt - middle)) breakAt = index;
  }
  return breakAt === -1 ? [label] : [label.slice(0, breakAt), label.slice(breakAt + 1)];
}

export function GestorSpendingChart({ data }: { data: ExpensesByNatureResponse["data"] }) {
  const rows = useMemo(() => selectExpenseRows(data).map((item) => ({
    label: natureLabel(item.codigo_natureza, item.nome_natureza),
    value: Number(item.valor_total_dotacao) || 0,
  })), [data]);

  const options = useMemo<ApexOptions>(() => ({
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "inherit",
      animations: { enabled: true, speed: 900, animateGradually: { enabled: true, delay: 90 } },
    },
    colors: rows.map((_, index) => (index === 0 ? TOP_COLOR : OTHER_COLOR)),
    plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 5, barHeight: "60%" } },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: { borderColor: "#E3EAF0", strokeDashArray: 4 },
    xaxis: {
      categories: rows.map((item) => wrapLabel(item.label)),
      tickAmount: 4,
      labels: { formatter: (value) => compactMoney(Number(value)), style: { colors: "#72808B", fontSize: "12px" } },
    },
    yaxis: { labels: { maxWidth: 190, style: { colors: "#25313C", fontSize: "12px" } } },
    tooltip: {
      theme: "light",
      x: { formatter: (_value, opts) => rows[opts?.dataPointIndex ?? 0]?.label ?? "" },
      y: { formatter: (value) => money(value), title: { formatter: () => "Dotação prevista:" } },
    },
  }), [rows]);

  return (
    <Chart
      type="bar"
      height={Math.max(260, 60 + rows.length * 44)}
      options={options}
      series={[{ name: "Dotação prevista", data: rows.map((item) => item.value) }]}
    />
  );
}
