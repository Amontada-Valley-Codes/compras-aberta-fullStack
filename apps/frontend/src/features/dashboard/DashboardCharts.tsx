"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const baseChart: ApexOptions = {
  chart: {
    toolbar: { show: false },
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    animations: { enabled: true, speed: 500 },
  },
  dataLabels: { enabled: false },
  grid: { borderColor: "#E3EAF0", strokeDashArray: 4 },
  legend: { fontSize: "12px", labels: { colors: "#5E6D78" } },
  tooltip: { theme: "light" },
};

export function SpendingAreaChart({
  categories = ["Fortaleza", "Caucaia", "Sobral", "Juazeiro", "Maracanaú", "Itapipoca"],
  totalSeries = [0, 0, 0, 0, 0, 0],
  matchSeries = [0, 0, 0, 0, 0, 0],
  primaryLabel = "Total em editais abertos",
  secondaryLabel = "Compatível com seu CNAE",
}: {
  categories?: string[];
  totalSeries?: number[];
  matchSeries?: number[];
  primaryLabel?: string;
  secondaryLabel?: string;
} = {}) {
  const options: ApexOptions = {
    ...baseChart,
    chart: { ...baseChart.chart, type: "bar" },
    colors: ["#2563A6", "#16A34A"],
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: "52%",
      },
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#72808B", fontSize: "12px" } },
    },
    yaxis: {
      labels: {
        formatter: (value) => {
          if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)} mi`;
          if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)} mil`;
          return `R$ ${value.toFixed(0)}`;
        },
        style: { colors: "#72808B", fontSize: "12px" },
      },
    },
    tooltip: {
      theme: "light",
      y: {
        formatter: (value) =>
          value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      },
    },
  };

  return (
    <Chart
      type="bar"
      height={286}
      options={options}
      series={[
        {
          name: primaryLabel,
          data: totalSeries,
        },
        {
          name: secondaryLabel,
          data: matchSeries,
        },
      ]}
    />
  );
}

export function OpportunityDonut({
  labels = ["Pregão Eletrônico", "Dispensa", "Concorrência", "Outras"],
  series = [0, 0, 0, 0],
  totalLabel = "licitações",
}: {
  labels?: string[];
  series?: number[];
  totalLabel?: string;
} = {}) {
  const totalCount = series.reduce((acc, v) => acc + v, 0);
  const options: ApexOptions = {
    ...baseChart,
    chart: { ...baseChart.chart, type: "donut" },
    colors: ["#2563A6", "#16A34A", "#D9A441", "#5B9BD5", "#8B5CF6"],
    labels,
    stroke: { width: 3, colors: ["#FFFFFF"] },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            name: { show: true, offsetY: 18, color: "#72808B" },
            value: {
              show: true,
              offsetY: -16,
              color: "#123B5D",
              fontSize: "24px",
              fontWeight: 700,
            },
            total: {
              show: true,
              label: totalLabel,
              color: "#72808B",
              formatter: () => String(totalCount),
            },
          },
        },
      },
    },
    legend: {
      ...baseChart.legend,
      position: "bottom",
      itemMargin: { horizontal: 8, vertical: 4 },
    },
  };

  return (
    <Chart
      type="donut"
      height={286}
      options={options}
      series={totalCount > 0 ? series : [1]}
    />
  );
}
