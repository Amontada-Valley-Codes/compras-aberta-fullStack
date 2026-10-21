"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { count } from "@/features/public-data/format";
import type { SupplierOrigin, SupplierRow } from "./gestor-domain";
import { GestorSuppliersTable } from "./GestorSuppliersTable";

const PAGE_SIZE = 25;

type OriginFilter = "all" | SupplierOrigin;
type SizeFilter = "all" | "micro" | "other";

// Ranking completo de fornecedores do ano, com busca e filtros. A posição
// (#) continua a do ranking geral mesmo com filtro aplicado.
export function GestorSuppliersRanking({ rows, query, showCategory }: { rows: SupplierRow[]; query: string; showCategory: boolean }) {
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState<OriginFilter>("all");
  const [size, setSize] = useState<SizeFilter>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    const digits = term.replace(/\D/g, "");
    return rows.filter((row) =>
      (origin === "all" || row.origin === origin)
      && (size === "all" || (size === "micro" ? row.isMicro : !row.isMicro))
      && (!term
        || row.name.toLocaleLowerCase("pt-BR").includes(term)
        || (row.city ?? "").toLocaleLowerCase("pt-BR").includes(term)
        || (digits.length >= 4 && row.cnpj.startsWith(digits))),
    );
  }, [rows, search, origin, size]);

  const reset = () => setVisible(PAGE_SIZE);

  return (
    <div className="gs-list">
      <div className="gs-toolbar">
        <label className="gs-search">
          <Search aria-hidden="true" />
          <input
            id="gestor-suppliers-search"
            value={search}
            onChange={(event) => { setSearch(event.target.value); reset(); }}
            placeholder="Buscar por empresa, cidade ou início do CNPJ"
            aria-label="Buscar fornecedor por empresa, cidade ou início do CNPJ"
          />
        </label>
        <div className="gs-segmented" role="group" aria-label="Filtrar por origem">
          {([["all", "Todos"], ["local", "Locais"], ["external", "De fora"]] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={origin === value} onClick={() => { setOrigin(value); reset(); }}>{label}</button>
          ))}
        </div>
        <div className="gs-segmented" role="group" aria-label="Filtrar por porte">
          {([["all", "Todos os portes"], ["micro", "Microempresas"], ["other", "Demais"]] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={size === value} onClick={() => { setSize(value); reset(); }}>{label}</button>
          ))}
        </div>
      </div>

      <p className="gs-list-count" aria-live="polite">{count(filtered.length)} de {count(rows.length)} fornecedores</p>

      {filtered.length === 0 ? (
        <div className="gs-state" role="status"><strong>Nenhum fornecedor encontrado</strong><span>Tente outro termo de busca ou retire os filtros.</span></div>
      ) : (
        <GestorSuppliersTable rows={filtered.slice(0, visible)} query={query} showCategory={showCategory} />
      )}

      {visible < filtered.length && (
        <button type="button" className="gs-more" onClick={() => setVisible((value) => value + PAGE_SIZE)}>
          Mostrar mais {count(Math.min(PAGE_SIZE, filtered.length - visible))}
        </button>
      )}
    </div>
  );
}
