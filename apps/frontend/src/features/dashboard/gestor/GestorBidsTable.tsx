"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { count, money } from "@/features/public-data/format";
import { formatDateBr, type BidRow } from "./gestor-domain";

const PAGE_SIZE = 25;

type Sort = "recent" | "value";

// Lista das licitações do ano: busca, filtro e ordenação no navegador (os
// dados já chegam completos do servidor).
export function GestorBidsTable({ rows, query }: { rows: BidRow[]; query: string }) {
  const [search, setSearch] = useState("");
  const [onlyLocal, setOnlyLocal] = useState(false);
  const [sort, setSort] = useState<Sort>("recent");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    const list = rows.filter((row) =>
      (!onlyLocal || row.hasLocalWinner)
      && (!term
        || row.number.toLocaleLowerCase("pt-BR").includes(term)
        || row.winners.some((winner) => winner.name.toLocaleLowerCase("pt-BR").includes(term))),
    );
    return sort === "value" ? [...list].sort((a, b) => b.value - a.value) : list;
  }, [rows, search, onlyLocal, sort]);

  const shown = filtered.slice(0, visible);

  return (
    <div className="gs-list">
      <div className="gs-toolbar">
        <label className="gs-search">
          <Search aria-hidden="true" />
          <input
            id="gestor-bids-search"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setVisible(PAGE_SIZE); }}
            placeholder="Buscar por número ou empresa vencedora"
            aria-label="Buscar licitação por número ou empresa vencedora"
          />
        </label>
        <label className="gs-check">
          <input id="gestor-bids-local" type="checkbox" checked={onlyLocal} onChange={(event) => { setOnlyLocal(event.target.checked); setVisible(PAGE_SIZE); }} />
          Só com vencedor local
        </label>
        <div className="gs-segmented" role="group" aria-label="Ordenar licitações">
          <button type="button" aria-pressed={sort === "recent"} onClick={() => setSort("recent")}>Mais recentes</button>
          <button type="button" aria-pressed={sort === "value"} onClick={() => setSort("value")}>Maior valor</button>
        </div>
      </div>

      <p className="gs-list-count" aria-live="polite">{count(filtered.length)} de {count(rows.length)} licitações</p>

      {shown.length === 0 ? (
        <div className="gs-state" role="status"><strong>Nenhuma licitação encontrada</strong><span>Tente outro termo de busca ou retire o filtro.</span></div>
      ) : (
        <div className="gs-table-scroll">
          <table className="gs-table">
            <thead>
              <tr>
                <th scope="col">Licitação</th>
                <th scope="col">Data</th>
                <th scope="col">Vencedores</th>
                <th scope="col" className="is-number">Itens</th>
                <th scope="col" className="is-number">Valor</th>
                <th scope="col"><span className="gs-sr-only">Abrir</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => {
                const href = `/gestor/licitacoes/detalhe?${query}&numero=${encodeURIComponent(row.number)}`;
                return (
                  <tr key={row.number}>
                    <td><Link className="gs-company-link gs-bid-number" href={href}>{row.number}</Link></td>
                    <td className="gs-nowrap">{formatDateBr(row.date)}</td>
                    <td>
                      {row.winners.length === 0 ? (
                        <span className="gs-muted">Sem vencedor registrado</span>
                      ) : (
                        <span className="gs-winners">
                          {row.winners.slice(0, 2).map((winner) => (
                            <span key={winner.cnpj} className={`gs-winner is-${winner.origin}`} title={winner.origin === "local" ? "Empresa da cidade" : undefined}>
                              <i aria-hidden="true" />{winner.name}
                            </span>
                          ))}
                          {row.winners.length > 2 && <small>+{row.winners.length - 2} {row.winners.length - 2 === 1 ? "empresa" : "empresas"}</small>}
                        </span>
                      )}
                    </td>
                    <td className="is-number">{count(row.items)}</td>
                    <td className="is-number"><strong>{money(row.value)}</strong></td>
                    <td><Link className="gs-row-action" href={href} aria-label={`Ver itens da licitação ${row.number}`}><ArrowRight /></Link></td>
                  </tr>
                );
              })}
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
