"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import type { AnalysisMock } from "@/lib/analysis-mock";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const base: ApexOptions = {
  chart: {
    toolbar: { show: false },
    fontFamily: "Inter, sans-serif",
    animations: { speed: 450 },
  },
  dataLabels: { enabled: false },
  grid: { borderColor: "#E2EAF0", strokeDashArray: 4 },
  tooltip: { theme: "light" },
};

const money = (value: number) =>
  `R$ ${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;

export function SectorEvolutionChart({ data }: { data: AnalysisMock }) {
  const options: ApexOptions = {
    ...base,
    chart: { ...base.chart, type: "line" },
    colors: ["#2563A6"],
    stroke: { curve: "smooth", width: 3 },
    markers: {
      size: 4,
      colors: ["#FFFFFF"],
      strokeColors: "#2563A6",
      strokeWidth: 2,
    },
    xaxis: {
      categories: [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#71818B", fontSize: "11px" } },
    },
    yaxis: {
      labels: {
        formatter: money,
        style: { colors: "#71818B", fontSize: "10px" },
      },
    },
    tooltip: {
      y: {
        formatter: (value) =>
          value == null
            ? "Sem dados"
            : new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(value),
      },
    },
  };
  return (
    <Chart
      type="line"
      height={320}
      options={options}
      series={[{ name: data.category, data: data.monthly }]}
    />
  );
}

export function NatureValuesChart({ data }: { data: AnalysisMock }) {
  const options: ApexOptions = {
    ...base,
    chart: { ...base.chart, type: "bar" },
    colors: ["#2563A6"],
    plotOptions: {
      bar: { horizontal: true, borderRadius: 5, barHeight: "48%" },
    },
    xaxis: {
      categories: data.natures.map((item) => item.name),
      labels: {
        formatter: money,
        style: { colors: "#71818B", fontSize: "10px" },
      },
    },
    yaxis: {
      labels: { style: { colors: "#425664", fontSize: "10px" }, maxWidth: 180 },
    },
    tooltip: {
      y: {
        formatter: (value) =>
          new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(value),
      },
    },
  };
  return (
    <Chart
      type="bar"
      height={320}
      options={options}
      series={[
        {
          name: "Valor empenhado",
          data: data.natures.map((item) => item.value),
        },
      ]}
    />
  );
}

export function SupplierOriginChart({ data }: { data: AnalysisMock }) {
  const options: ApexOptions = {
    ...base,
    chart: { ...base.chart, type: "donut" },
    labels: [
      "Fornecedores locais",
      "Outros municípios do Ceará",
      "Outros estados",
    ],
    colors: ["#2563A6", "#75A7C9", "#D9A441"],
    stroke: { colors: ["#FFFFFF"], width: 4 },
    legend: {
      position: "bottom",
      fontSize: "11px",
      labels: { colors: "#60717C" },
      itemMargin: { horizontal: 9, vertical: 5 },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "fornecedores",
              color: "#71818B",
              formatter: () => String(data.suppliers),
            },
            value: { color: "#123B5D", fontSize: "23px", fontWeight: 700 },
          },
        },
      },
    },
  };
  return (
    <Chart
      type="donut"
      height={320}
      options={options}
      series={[
        data.localSuppliers,
        data.regionalSuppliers,
        data.externalSuppliers,
      ]}
    />
  );
}

export function TopSuppliersChart({ data }: { data: AnalysisMock }) {
  const suppliers = [...data.topSuppliers].reverse();
  const options: ApexOptions = {
    ...base,
    chart: { ...base.chart, type: "bar" },
    colors: ["#123B5D"],
    plotOptions: {
      bar: { horizontal: true, borderRadius: 5, barHeight: "46%" },
    },
    xaxis: {
      categories: suppliers.map((item) => item.name),
      labels: {
        formatter: money,
        style: { colors: "#71818B", fontSize: "10px" },
      },
    },
    yaxis: {
      labels: { style: { colors: "#425664", fontSize: "10px" }, maxWidth: 170 },
    },
    tooltip: {
      y: {
        formatter: (value) =>
          new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(value),
      },
    },
  };
  return (
    <Chart
      type="bar"
      height={320}
      options={options}
      series={[
        { name: "Valor empenhado", data: suppliers.map((item) => item.value) },
      ]}
    />
  );
}
