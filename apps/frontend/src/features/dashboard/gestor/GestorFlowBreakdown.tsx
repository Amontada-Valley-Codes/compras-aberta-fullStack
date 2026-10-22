"use client";

import { useState } from "react";
import { count, money, percent } from "@/features/public-data/format";
import { FLOW_STATUS_LABEL, type FlowBreakdown, type FlowGroup, type FlowStatus } from "./pncp-domain";

const STATUSES: FlowStatus[] = ["contracted", "awarded", "pending"];
const VISIBLE_ROWS = 8;

function Segments({ group, total }: { group: Pick<FlowGroup, "parts">; total: number }) {
  return (
    <>
      {STATUSES.map((status) => group.parts[status] > 0 && (
        <span
          key={status}
          className={`gs-flow-segment is-${status}`}
          style={{ width: `${(group.parts[status] / total) * 100}%` }}
          title={`${FLOW_STATUS_LABEL[status]}: ${money(group.parts[status])} (${percent((group.parts[status] / total) * 100)})`}
        />
      ))}
    </>
  );
}

// Em que situação está o dinheiro das contratações do ano, por secretaria ou
// por modalidade. Cada linha é uma barra dividida pelas três situações; o
// comprimento da barra acompanha o valor da secretaria.
export function GestorFlowBreakdown({ data }: { data: FlowBreakdown }) {
  const [view, setView] = useState<"unit" | "modality">("unit");
  const [showAll, setShowAll] = useState(false);
  const groups = view === "unit" ? data.byUnit : data.byModality;
  const visible = showAll ? groups : groups.slice(0, VISIBLE_ROWS);
  const max = Math.max(1, ...groups.map((group) => group.total));

  return (
    <div className="gs-flow">
      <div className="gs-flow-summary">
        <div className="gs-flow-bar is-summary" aria-hidden="true">
          <Segments group={{ parts: data.totals }} total={Math.max(1, data.total)} />
        </div>
        <ul className="gs-flow-legend">
          {/* Situação sem nenhum valor (ex.: prefeitura que não publica o homologado) não aparece. */}
          {STATUSES.filter((status) => data.totals[status] > 0).map((status) => (
            <li key={status} className={`is-${status}`}>
              <i aria-hidden="true" />
              <span>{FLOW_STATUS_LABEL[status]}</span>
              <b>{money(data.totals[status])}</b>
              <small>{percent(data.total ? (data.totals[status] / data.total) * 100 : 0)}</small>
            </li>
          ))}
        </ul>
      </div>

      <div className="gs-flow-head">
        <p>{view === "unit" ? "Por secretaria" : "Por modalidade"}</p>
        <div className="gs-segmented" role="group" aria-label="Agrupar por">
          <button type="button" aria-pressed={view === "unit"} onClick={() => { setView("unit"); setShowAll(false); }}>Secretaria</button>
          <button type="button" aria-pressed={view === "modality"} onClick={() => { setView("modality"); setShowAll(false); }}>Modalidade</button>
        </div>
      </div>

      <ul className="gs-flow-rows">
        {visible.map((group) => (
          <li key={group.label}>
            <span className="gs-flow-label" title={group.label}>{group.label}</span>
            <div className="gs-flow-track">
              <div className="gs-flow-bar" style={{ width: `${Math.max(2, (group.total / max) * 100)}%` }}>
                <Segments group={group} total={group.total} />
              </div>
            </div>
            <span className="gs-flow-value">
              <b>{money(group.total)}</b>
              <small>
                {count(group.count)} {group.count === 1 ? "contratação" : "contratações"}
                {" • "}{percent(group.total ? (group.parts.contracted / group.total) * 100 : 0)} contratado
              </small>
            </span>
          </li>
        ))}
      </ul>

      {groups.length > VISIBLE_ROWS && (
        <button type="button" className="gs-more" onClick={() => setShowAll((value) => !value)}>
          {showAll ? "Mostrar menos" : `Mostrar todas (${count(groups.length)})`}
        </button>
      )}
    </div>
  );
}
