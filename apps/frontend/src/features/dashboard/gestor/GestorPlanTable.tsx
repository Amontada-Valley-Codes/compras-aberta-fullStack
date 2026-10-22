"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { count, money } from "@/features/public-data/format";
import { sentenceCase } from "@/features/public-data/plain-language";
import { formatDateBr } from "./gestor-domain";
import type { PncpPlanItem } from "./pncp-api";
import { unitLabel } from "./pncp-domain";

const PAGE_SIZE = 25;
type Sort = "value" | "date";

// Itens do Plano de Contratações Anual: busca, categoria e ordenação.
export function GestorPlanTable({ items }: { items: PncpPlanItem[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<Sort>("value");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const categories = useMemo(() => [...new Set(items.map((item) => item.category))].sort(), [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    const list = items.filter((item) =>
      (!category || item.category === category)
      && (!term
        || item.description.toLocaleLowerCase("pt-BR").includes(term)
        || (item.classification ?? "").toLocaleLowerCase("pt-BR").includes(term)
        || item.unitName.toLocaleLowerCase("pt-BR").includes(term)),
    );
    return sort === "value"
      ? [...list].sort((a, b) => b.total - a.total)
      : [...list].sort((a, b) => (a.desiredDate ?? "9999").localeCompare(b.desiredDate ?? "9999"));
  }, [items, search, category, sort]);

  const reset = () => setVisible(PAGE_SIZE);

  return (
    <div className="gs-list">
      <div className="gs-toolbar">
        <label className="gs-search">
          <Search aria-hidden="true" />
          <input id="gestor-plan-search" value={search} onChange={(event) => { setSearch(event.target.value); reset(); }} placeholder="Buscar item, classificação ou secretaria" aria-label="Buscar item do plano" />
        </label>
        <select id="gestor-plan-category" className="gs-select" value={category} onChange={(event) => { setCategory(event.target.value); reset(); }} aria-label="Filtrar por categoria">
          <option value="">Todas as categorias</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <div className="gs-segmented" role="group" aria-label="Ordenar itens">
          <button type="button" aria-pressed={sort === "value"} onClick={() => setSort("value")}>Maior valor</button>
          <button type="button" aria-pressed={sort === "date"} onClick={() => setSort("date")}>Data desejada</button>
        </div>
      </div>

      <p className="gs-list-count" aria-live="polite">{count(filtered.length)} de {count(items.length)} itens</p>

      {filtered.length === 0 ? (
        <div className="gs-state" role="status"><strong>Nenhum item encontrado</strong><span>Tente outro termo de busca ou outra categoria.</span></div>
      ) : (
        <div className="gs-table-scroll">
          <table className="gs-table gs-plan-table">
            <thead>
              <tr>
                <th scope="col">Item planejado</th>
                <th scope="col">Categoria</th>
                <th scope="col" className="is-number">Quantidade</th>
                <th scope="col" className="is-number">Valor total</th>
                <th scope="col">Desejado para</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, visible).map((item, index) => (
                <tr key={`${item.agencyCnpj}-${index}-${item.description}`}>
                  <td>
                    <span className="gs-clamp" title={item.description}>{sentenceCase(item.description)}</span>
                    <small className="gs-company-meta">{unitLabel(item.unitName)}</small>
                  </td>
                  <td>
                    <span className="gs-chip">{item.category}</span>
                    {item.classification && <small className="gs-company-meta gs-clamp gs-clamp--1" title={item.classification}>{sentenceCase(item.classification)}</small>}
                  </td>
                  <td className="is-number">{item.quantity.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} <small className="gs-muted">{item.unit?.toLowerCase()}</small></td>
                  <td className="is-number"><strong>{money(item.total)}</strong></td>
                  <td className="gs-nowrap">{formatDateBr(item.desiredDate)}</td>
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
