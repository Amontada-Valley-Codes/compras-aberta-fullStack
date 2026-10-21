"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type CSSProperties } from "react";
import type { ApexOptions } from "apexcharts";
import { money, percent } from "@/features/public-data/format";
import type { GestorRetention } from "./gestor-data";

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => <div className="ov-chart-placeholder" aria-hidden="true" />,
});

export function GestorRetentionChart({ data, municipalityName }: { data: GestorRetention; municipalityName: string }) {
  const [focus, setFocus] = useState<number | null>(null);

  const items = useMemo(() => {
    const share = (value: number) => (data.total > 0 ? (value / data.total) * 100 : 0);
    return [
      { label: `Empresas de ${municipalityName}`, value: data.local, color: "#2D8B6F" },
      { label: "Empresas de outras cidades", value: data.external, color: "#8AA4BC" },
      { label: "Cidade não identificada", value: data.unknown, color: "#D5DEE6" },
    ]
      .filter((item, index) => index < 2 || item.value > 0)
      .map((item) => ({ ...item, share: share(item.value) }));
  }, [data, municipalityName]);

  const focused = focus === null ? null : items[focus];

  const options = useMemo<ApexOptions>(() => ({
    chart: {
      type: "donut",
      fontFamily: "inherit",
      animations: { enabled: true, speed: 900, animateGradually: { enabled: true, delay: 90 } },
      events: {
        dataPointMouseEnter: (_event, _chart, opts) => {
          if (typeof opts?.dataPointIndex === "number") setFocus(opts.dataPointIndex);
        },
        dataPointMouseLeave: () => setFocus(null),
      },
    },
    colors: items.map((item) => item.color),
    labels: items.map((item) => item.label),
    stroke: { width: 3, colors: ["#FFFFFF"] },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { enabled: false },
    states: { hover: { filter: { type: "none" } }, active: { filter: { type: "none" } } },
    plotOptions: { pie: { expandOnClick: false, donut: { size: "74%", labels: { show: false } } } },
  }), [items]);

  return (
    <div className="ov-donut gs-retention" data-focus={focus ?? undefined}>
      <div className="ov-donut-chart">
        <Chart type="donut" height={250} options={options} series={items.map((item) => item.value)} />
        <div className="ov-donut-center" aria-live="polite">
          <small>{focused ? focused.label : "ficou na cidade"}</small>
          <b>{percent(focused ? focused.share : data.localPercent)}</b>
          <em>{money(focused ? focused.value : data.local)}</em>
        </div>
      </div>
      <ul className="ov-donut-legend gs-retention-legend">
        {items.map((item, index) => (
          <li
            key={item.label}
            className={focus === index ? "is-focused" : ""}
            onMouseEnter={() => setFocus(index)}
            onMouseLeave={() => setFocus(null)}
            style={{ "--tone": item.color, "--percent": `${item.share}%` } as CSSProperties}
          >
            <span title={item.label}><i />{item.label}</span>
            <b>{money(item.value)}</b>
            <em>{percent(item.share)}</em>
            <s aria-hidden="true" />
          </li>
        ))}
      </ul>
    </div>
  );
}
