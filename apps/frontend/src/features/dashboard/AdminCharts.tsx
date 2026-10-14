"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState, type CSSProperties } from "react";
import type ApexCharts from "apexcharts";
import type { ApexOptions } from "apexcharts";
import { CountUp } from "./CountUp";

// O ApexCharts é pesado: só carrega no cliente, em um chunk separado. Enquanto
// isso, um placeholder com a mesma altura evita que o layout "pule".
const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => <div className="ov-chart-placeholder" aria-hidden="true" />,
});

// Animação de entrada dos gráficos: crescem em sequência quando o painel abre
// (recarregar a página ou entrar no sistema) e animam de novo ao trocar dados.
const entranceAnimation: NonNullable<ApexOptions["chart"]>["animations"] = {
  enabled: true,
  speed: 900,
  animateGradually: { enabled: true, delay: 90 },
  dynamicAnimation: { enabled: true, speed: 450 },
};

const axisLabel = { colors: "#72808B", fontSize: "12px" };

/* ------------------------------------------------------------------ */
/* Fluxo de cadastros: colunas recebidas/aprovadas + linha de taxa     */
/* ------------------------------------------------------------------ */

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type Period = 6 | 12;

export interface FlowRequest {
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

// Agrupa as solicitações reais pelo mês de envio: quantas chegaram em cada
// mês e quantas delas já foram aprovadas.
export function AdminFlowChart({ requests }: { requests: FlowRequest[] }) {
  const [period, setPeriod] = useState<Period>(6);

  const { categories, received, approved, rate } = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: period }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (period - 1 - index), 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
    const receivedSlice = months.map(() => 0);
    const approvedSlice = months.map(() => 0);

    for (const request of requests) {
      const created = new Date(request.createdAt);
      const index = months.findIndex(
        (item) => item.year === created.getFullYear() && item.month === created.getMonth(),
      );
      if (index === -1) continue;
      receivedSlice[index] += 1;
      if (request.status === "APPROVED") approvedSlice[index] += 1;
    }

    return {
      categories: months.map((item) => MONTH_LABELS[item.month]),
      received: receivedSlice,
      approved: approvedSlice,
      rate: receivedSlice.map((value, index) =>
        value === 0 ? 0 : Math.round((approvedSlice[index] / value) * 100),
      ),
    };
  }, [period, requests]);

  const totalReceived = received.reduce((sum, value) => sum + value, 0);
  const totalApproved = approved.reduce((sum, value) => sum + value, 0);

  // Memoizados: opções ou séries novas a cada render fariam o Apex redesenhar
  // o gráfico do zero (e cortar as animações).
  const options = useMemo<ApexOptions>(() => ({
    chart: {
      type: "line",
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "inherit",
      animations: entranceAnimation,
    },
    colors: ["#2563A6", "#8AB5D2", "#D9A441"],
    plotOptions: { bar: { borderRadius: 6, borderRadiusApplication: "end", columnWidth: "52%" } },
    stroke: { width: [0, 0, 3], curve: "smooth" },
    markers: {
      size: [0, 0, 4],
      strokeWidth: 2,
      strokeColors: "#fff",
      hover: { sizeOffset: 3 },
    },
    dataLabels: { enabled: false },
    grid: { borderColor: "#E3EAF0", strokeDashArray: 4, padding: { left: 6, right: 6 } },
    legend: { show: false },
    states: {
      hover: { filter: { type: "lighten" } },
      active: { filter: { type: "none" } },
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      crosshairs: {
        show: true,
        width: "barWidth",
        fill: { type: "solid", color: "#EAF3F8" },
      },
      labels: { style: axisLabel },
    },
    yaxis: [
      { labels: { style: axisLabel }, min: 0 },
      { seriesName: "Recebidas", show: false },
      {
        opposite: true,
        min: 0,
        max: 100,
        tickAmount: 4,
        labels: { style: axisLabel, formatter: (value) => `${Math.round(value)}%` },
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
      theme: "light",
      y: {
        formatter: (value, opts) =>
          opts?.seriesIndex === 2 ? `${value}%` : `${value} solicitações`,
      },
    },
  }), [categories]);

  const series = useMemo(
    () => [
      { name: "Recebidas", type: "column", data: received },
      { name: "Aprovadas", type: "column", data: approved },
      { name: "Taxa de aprovação", type: "line", data: rate },
    ],
    [received, approved, rate],
  );

  return (
    <div className="ov-flow">
      <div className="ov-flow-toolbar">
        <dl className="ov-flow-totals">
          <div>
            <dt>
              <i className="is-received" /> Recebidas
            </dt>
            <dd>
              <CountUp value={totalReceived} delay={350} />
            </dd>
          </div>
          <div>
            <dt>
              <i className="is-approved" /> Aprovadas
            </dt>
            <dd>
              <CountUp value={totalApproved} delay={450} />
            </dd>
          </div>
          <div>
            <dt>
              <i className="is-rate" /> Taxa de aprovação
            </dt>
            <dd>
              <CountUp
                value={totalReceived === 0 ? 0 : Math.round((totalApproved / totalReceived) * 100)}
                suffix="%"
                delay={550}
              />
            </dd>
          </div>
        </dl>
        <div className="ov-segmented" role="tablist" aria-label="Período do gráfico">
          {([6, 12] as Period[]).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={period === value}
              className={period === value ? "is-active" : ""}
              onClick={() => setPeriod(value)}
            >
              {value} meses
            </button>
          ))}
        </div>
      </div>
      <div className="ov-chart ov-chart-flow">
        <Chart type="line" height={300} options={options} series={series} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Situação cadastral: donut com centro e legenda interativos          */
/* ------------------------------------------------------------------ */

interface RegistrationDonutProps {
  approved: number;
  pending: number;
  rejected: number;
}

export function RegistrationDonut({ approved, pending, rejected }: RegistrationDonutProps) {
  const [focus, setFocus] = useState<number | null>(null);
  const chartRef = useRef<ApexCharts | null>(null);
  const selectedRef = useRef<number | null>(null);

  const items = useMemo(
    () => [
      { label: "Aprovadas", value: approved, color: "#2D8B6F" },
      { label: "Em análise", value: pending, color: "#D9A441" },
      { label: "Recusadas", value: rejected, color: "#D65C5C" },
    ],
    [approved, pending, rejected],
  );

  const total = items.reduce((sum, item) => sum + item.value, 0);
  const focused = focus === null ? null : items[focus];

  // Passar o mouse numa fatia ou num item da legenda "puxa" a fatia para
  // fora (seleção animada do Apex), apaga as outras e mostra o valor no centro.
  // Só mexe em refs e em setFocus (estáveis), então é criada uma vez e pode
  // ser usada pelos eventos do Apex registrados na montagem.
  const select = useCallback((index: number | null) => {
    if (selectedRef.current === index) return;
    const chart = chartRef.current;
    if (chart) {
      if (selectedRef.current !== null) chart.toggleDataPointSelection(selectedRef.current);
      if (index !== null) chart.toggleDataPointSelection(index);
    }
    selectedRef.current = index;
    setFocus(index);
  }, []);

  const options = useMemo<ApexOptions>(() => ({
    chart: {
      type: "donut",
      fontFamily: "inherit",
      animations: entranceAnimation,
      events: {
        mounted: (chart) => {
          chartRef.current = chart;
        },
        dataPointMouseEnter: (_event, _chart, opts) => {
          if (typeof opts?.dataPointIndex === "number") select(opts.dataPointIndex);
        },
        dataPointMouseLeave: () => select(null),
      },
    },
    colors: items.map((item) => item.color),
    labels: items.map((item) => item.label),
    stroke: { width: 3, colors: ["#FFFFFF"] },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { enabled: false },
    states: {
      hover: { filter: { type: "none" } },
      active: { filter: { type: "none" } },
    },
    plotOptions: {
      pie: {
        expandOnClick: true,
        donut: { size: "74%", labels: { show: false } },
      },
    },
  }), [items, select]);

  const donutSeries = useMemo(() => {
    const values = items.map((item) => item.value);
    return total === 0 ? [1] : values;
  }, [items, total]);

  return (
    <div className="ov-donut" data-focus={focus ?? undefined}>
      <div className="ov-donut-chart">
        <Chart
          type="donut"
          height={250}
          options={options}
          series={donutSeries}
        />
        <div className="ov-donut-center" aria-live="polite">
          <small>{focused ? focused.label : "microempresas"}</small>
          <b>
            <CountUp value={focused ? focused.value : total} duration={600} />
          </b>
          <em>
            {focused
              ? `${total === 0 ? 0 : Math.round((focused.value / total) * 100)}% do total`
              : "na base"}
          </em>
        </div>
      </div>
      <ul className="ov-donut-legend">
        {items.map((item, index) => {
          const percent = total === 0 ? 0 : Math.round((item.value / total) * 100);
          return (
            <li
              key={item.label}
              className={focus === index ? "is-focused" : ""}
              onMouseEnter={() => select(index)}
              onMouseLeave={() => select(null)}
              style={{ "--tone": item.color, "--percent": `${percent}%` } as CSSProperties}
            >
              <span>
                <i />
                {item.label}
              </span>
              <b>{item.value}</b>
              <em>{percent}%</em>
              <s aria-hidden="true" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mini gráfico dos cards de indicadores                               */
/* SVG puro (sem Apex): leve o bastante para vários na mesma tela.     */
/* ------------------------------------------------------------------ */

const SPARK_W = 120;
const SPARK_H = 36;

export function Sparkline({ data, color }: { data: number[]; color: string }) {
  const { line, area } = useMemo(() => {
    const min = Math.min(...data);
    const range = Math.max(...data) - min || 1;
    const points = data.map((value, index) => [
      (index / (data.length - 1)) * SPARK_W,
      SPARK_H - 3 - ((value - min) / range) * (SPARK_H - 8),
    ]);
    // Curva suave: cada trecho é uma Bézier com controles no meio do caminho.
    const path = points
      .map(([x, y], index) => {
        if (index === 0) return `M${x},${y}`;
        const [px, py] = points[index - 1];
        const mx = (px + x) / 2;
        return `C${mx},${py} ${mx},${y} ${x},${y}`;
      })
      .join(" ");
    return {
      line: path,
      area: `${path} L${SPARK_W},${SPARK_H} L0,${SPARK_H} Z`,
    };
  }, [data]);
  const gradientId = `spark-${color.slice(1)}`;

  return (
    <svg
      className="ov-sparkline"
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ "--spark": color } as CSSProperties}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="ov-spark-area" d={area} fill={`url(#${gradientId})`} />
      <path className="ov-spark-line" d={line} pathLength={1} />
    </svg>
  );
}
