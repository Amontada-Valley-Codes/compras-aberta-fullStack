"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { compactMoney, money } from "@/features/public-data/format";

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => <div className="ov-chart-placeholder" aria-hidden="true" />,
});

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// Valor homologado por mês da licitação; o mês de maior valor fica em destaque.
export function GestorMonthlyChart({ values }: { values: number[] }) {
  const peak = values.reduce((best, value, index) => (value > values[best] ? index : best), 0);

  const options = useMemo<ApexOptions>(() => ({
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "inherit",
      animations: { enabled: true, speed: 800, animateGradually: { enabled: true, delay: 60 } },
    },
    colors: values.map((_, index) => (index === peak ? "#11169B" : "#7FA8DC")),
    plotOptions: { bar: { distributed: true, borderRadius: 6, columnWidth: "58%" } },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: { borderColor: "#E3EAF0", strokeDashArray: 4 },
    xaxis: {
      categories: MONTHS,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#72808B", fontSize: "12px" } },
    },
    yaxis: { labels: { formatter: (value) => compactMoney(Number(value)), style: { colors: "#72808B", fontSize: "12px" } } },
    tooltip: {
      theme: "light",
      x: { formatter: (_value, opts) => MONTH_NAMES[opts?.dataPointIndex ?? 0] },
      y: { formatter: (value) => money(value), title: { formatter: () => "Homologado:" } },
    },
  }), [values, peak]);

  return <Chart type="bar" height={280} options={options} series={[{ name: "Homologado", data: values }]} />;
}
