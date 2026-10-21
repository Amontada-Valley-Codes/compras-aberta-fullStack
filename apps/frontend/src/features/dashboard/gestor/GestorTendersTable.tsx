"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { count, money } from "@/features/public-data/format";
import { formatDateBr } from "./gestor-domain";
import type { PncpProcurement } from "./pncp-api";
import { unitLabel } from "./pncp-domain";

const PAGE_SIZE = 25;

// Contratações publicadas no PNCP no ano: busca e filtros no navegador.
export function GestorTendersTable({ rows }: { rows: PncpProcurement[] }) {
  const [search, setSearch] = useState("");
  const [modality, setModality] = useState("");
  const [unit, setUnit] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const modalities = useMemo(() => [...new Set(rows.map((row) => row.modality))].sort(), [rows]);
  const units = useMemo(() => [...new Set(rows.map((row) => unitLabel(row.unitName)))].sort((a, b) => a.localeCompare(b, "pt-BR")), [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return rows
      .filter((row) =>
        (!modality || row.modality === modality)
        && (!unit || unitLabel(row.unitName) === unit)
        && (!term
          || row.object.toLocaleLowerCase("pt-BR").includes(term)
          || row.purchaseNumber.toLocaleLowerCase("pt-BR").includes(term)
          || (row.process ?? "").toLocaleLowerCase("pt-BR").includes(term)),
      )
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  }, [rows, search, modality, unit]);

  const reset = () => setVisible(PAGE_SIZE);

  return (
    <div className="gs-list">
      <div className="gs-toolbar">
        <label className="gs-search">
          <Search aria-hidden="true" />
          <input id="gestor-tenders-search" value={search} onChange={(event) => { setSearch(event.target.value); reset(); }} placeholder="Buscar por objeto, número ou processo" aria-label="Buscar contratação por objeto, número ou processo" />
        </label>
        <select id="gestor-tenders-modality" className="gs-select" value={modality} onChange={(event) => { setModality(event.target.value); reset(); }} aria-label="Filtrar por modalidade">
          <option value="">Todas as modalidades</option>
          {modalities.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select id="gestor-tenders-unit" className="gs-select" value={unit} onChange={(event) => { setUnit(event.target.value); reset(); }} aria-label="Filtrar por secretaria ou órgão">
          <option value="">Todas as secretarias</option>
          {units.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      <p className="gs-list-count" aria-live="polite">{count(filtered.length)} de {count(rows.length)} contratações</p>

      {filtered.length === 0 ? (
        <div className="gs-state" role="status"><strong>Nenhuma contratação encontrada</strong><span>Tente outro termo de busca ou retire os filtros.</span></div>
      ) : (
        <div className="gs-table-scroll">
          <table className="gs-table gs-tenders-table">
            <thead>
              <tr>
                <th scope="col">Número</th>
                <th scope="col">Objeto</th>
                <th scope="col">Modalidade</th>
                <th scope="col">Publicação</th>
                <th scope="col" className="is-number">Estimado</th>
                <th scope="col" className="is-number">Homologado</th>
                <th scope="col"><span className="gs-sr-only">Abrir no PNCP</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, visible).map((row) => (
                <tr key={row.controlNumber}>
                  <td className="gs-nowrap"><b>{row.purchaseNumber}</b><small className="gs-company-meta">{row.process ?? "—"}</small></td>
                  <td>
                    <span className="gs-clamp" title={row.object}>{row.object}</span>
                    <small className="gs-company-meta">{unitLabel(row.unitName)}</small>
                  </td>
                  <td><span className="gs-chip">{row.modality}</span></td>
                  <td className="gs-nowrap">{formatDateBr(row.publishedAt)}</td>
                  <td className="is-number">{row.estimated ? money(row.estimated) : "—"}</td>
                  <td className="is-number">{row.awarded ? <strong>{money(row.awarded)}</strong> : <span className="gs-muted">Sem resultado</span>}</td>
                  <td><a className="gs-row-action" href={row.link} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${row.purchaseNumber} no PNCP`}><ExternalLink /></a></td>
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
