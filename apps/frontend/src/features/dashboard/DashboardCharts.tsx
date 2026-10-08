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

export function SpendingAreaChart() {
  const options: ApexOptions = {
    ...baseChart,
    chart: { ...baseChart.chart, type: "area" },
    colors: ["#2563A6", "#D9A441"],
    stroke: { curve: "smooth", width: [3, 2] },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.28, opacityTo: 0.02, stops: [0, 95] },
    },
    xaxis: {
      categories: ["Mar", "Abr", "Mai", "Jun", "Jul", "Ago"],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#72808B", fontSize: "12px" } },
    },
    yaxis: {
      labels: {
        formatter: (value) => `R$ ${(value / 1000).toFixed(0)} mil`,
        style: { colors: "#72808B", fontSize: "12px" },
      },
    },
    markers: { size: 0, hover: { size: 5 } },
  };

  return (
    <Chart
      type="area"
      height={286}
      options={options}
      series={[
        {
          name: "Mercado local",
          data: [280000, 340000, 315000, 480000, 525000, 620000],
        },
        {
          name: "Sua categoria",
          data: [110000, 145000, 132000, 190000, 215000, 248000],
        },
      ]}
    />
  );
}

export function OpportunityDonut() {
  const options: ApexOptions = {
    ...baseChart,
    chart: { ...baseChart.chart, type: "donut" },
    colors: ["#2563A6", "#5B9BD5", "#D9A441", "#B9CEDD"],
    labels: ["Alimentos", "Tecnologia", "Equipamentos", "Serviços"],
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
              label: "oportunidades",
              color: "#72808B",
              formatter: () => "28",
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
    <Chart type="donut" height={286} options={options} series={[9, 7, 6, 6]} />
  );
}
