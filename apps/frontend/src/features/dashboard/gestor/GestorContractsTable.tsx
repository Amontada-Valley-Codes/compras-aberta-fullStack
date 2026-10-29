"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { count, money } from "@/features/public-data/format";
import { titleCase } from "@/features/public-data/plain-language";
import { formatDateBr, maskCnpj } from "./gestor-domain";
import { CONTRACT_STATUS_LABEL, contractValueLabel, isCurrent, unitLabel, type ContractRow } from "./pncp-domain";

const PAGE_SIZE = 25;

type Filter = "current" | "ending" | "ended" | "all";

const FILTERS: Array<[Filter, string]> = [
  ["current", "Vigentes"],
  ["ending", "A vencer (90 dias)"],
  ["ended", "Encerrados"],
  ["all", "Todos"],
];

function deadlineText(row: ContractRow): string {
  if (row.daysLeft === null) return "Sem data de término";
  if (row.status === "ended") return `Encerrou há ${count(-row.daysLeft)} ${-row.daysLeft === 1 ? "dia" : "dias"}`;
  if (row.status === "upcoming") return "Ainda não começou";
  if (row.daysLeft === 0) return "Vence hoje";
  return `Faltam ${count(row.daysLeft)} ${row.daysLeft === 1 ? "dia" : "dias"}`;
}

export function GestorContractsTable({ rows }: { rows: ContractRow[] }) {
  const [filter, setFilter] = useState<Filter>("current");
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return rows.filter((row) =>
      (filter === "all"
        || (filter === "current" && isCurrent(row))
        || (filter === "ending" && (row.status === "ending30" || row.status === "ending90"))
        || (filter === "ended" && row.status === "ended"))
      && (!term
        || row.object.toLocaleLowerCase("pt-BR").includes(term)
        || row.supplierName.toLocaleLowerCase("pt-BR").includes(term)
        || (row.number ?? "").toLocaleLowerCase("pt-BR").includes(term)),
    );
  }, [rows, filter, search]);

  const reset = () => setVisible(PAGE_SIZE);

  return (
    <div className="gs-list">
      <div className="gs-toolbar">
        <label className="gs-search">
          <Search aria-hidden="true" />
          <input id="gestor-contracts-search" value={search} onChange={(event) => { setSearch(event.target.value); reset(); }} placeholder="Buscar por objeto, fornecedor ou número" aria-label="Buscar contrato por objeto, fornecedor ou número" />
        </label>
        <div className="gs-segmented" role="group" aria-label="Filtrar por situação">
          {FILTERS.map(([value, label]) => (
            <button key={value} type="button" aria-pressed={filter === value} onClick={() => { setFilter(value); reset(); }}>{label}</button>
          ))}
        </div>
      </div>

      <p className="gs-list-count" aria-live="polite">{count(filtered.length)} de {count(rows.length)} contratos</p>

      {filtered.length === 0 ? (
        <div className="gs-state" role="status"><strong>Nenhum contrato encontrado</strong><span>Tente outro termo de busca ou outra situação.</span></div>
      ) : (
        <div className="gs-table-scroll">
          <table className="gs-table gs-contracts-table">
            <thead>
              <tr>
                <th scope="col">Contrato</th>
                <th scope="col">Objeto</th>
                <th scope="col">Fornecedor</th>
                <th scope="col">Vigência</th>
                <th scope="col" className="is-number">Valor global</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, visible).map((row) => (
                <tr key={row.controlNumber}>
                  <td className="gs-nowrap"><b>{row.number ?? "—"}</b><small className="gs-company-meta">{row.type}</small></td>
                  <td>
                    <span className="gs-clamp" title={row.object}>{row.object}</span>
                    <small className="gs-company-meta">{unitLabel(row.unitName)}</small>
                  </td>
                  <td>
                    <span className="gs-clamp gs-clamp--1" title={row.supplierName}>{titleCase(row.supplierName)}</span>
                    <small className="gs-company-meta">{row.supplierDocument && row.supplierDocument.length === 14 ? maskCnpj(row.supplierDocument) : "Pessoa física ou documento não informado"}</small>
                  </td>
                  <td className="gs-validity">
                    <span className="gs-nowrap">{formatDateBr(row.startsAt)} – {formatDateBr(row.endsAt)}</span>
                    {row.progress !== null && <i className={`gs-progress is-${row.status}`} aria-hidden="true"><s style={{ width: `${row.progress}%` }} /></i>}
                    <small className={`gs-status is-${row.status}`} title={CONTRACT_STATUS_LABEL[row.status]}>{deadlineText(row)}</small>
                  </td>
                  <td className="is-number">{row.globalValue > 1 ? <strong>{money(row.globalValue)}</strong> : <span className="gs-muted">{contractValueLabel(row.globalValue, money)}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {visible < filtered.length && (
        <button type="button" className="gs-more" onClick={() => setVisible((value) => value + PAGE_SIZE)}>
          Mostrar mais {count(Math.min(PAGE_SIZE, filtered.length - visible))}
        </button>
      )}
    </div>
  );
}
