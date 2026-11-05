"use client";

import { PublicTable, PublicTablePagination, PublicSortHeader } from "@/components/filters/PublicTable";
import Link from "next/link";
import { useMemo, useRef, useState, type MouseEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Check, ChevronRight, Copy, Info, RefreshCw, Search, X } from "lucide-react";
import { PublicFilterSelect } from "@/components/filters/PublicFilterSelect";
import { formatDateBr } from "@/features/dashboard/gestor/gestor-domain";
import { count, money } from "@/features/public-data/format";
import { Card, PageHeader } from "./GestorPublicoViews";
import {
  GESTOR_PUBLICO_YEARS,
  getMunicipalitySummaries,
  getSupplierSummaries,
  natureName,
  type SupplierSize,
  type SupplierSummary,
} from "./gestor-publico-data";



const SIZE_LABEL: Record<SupplierSize, string> = {
  MEI: "Microempreendedor individual",
  ME: "Microempresa",
  EPP: "Empresa de pequeno porte",
  "Demais empresas": "Demais empresas",
};

const SIZES = Object.keys(SIZE_LABEL) as SupplierSize[];

interface SupplierFilters {
  municipality: string;
  year: number;
  size: SupplierSize | "";
}

const EMPTY_FILTERS: SupplierFilters = { municipality: "", year: GESTOR_PUBLICO_YEARS[0], size: "" };

const plain = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");

// Busca sem diferenciar acentos e maiúsculas. Quando só há números, compara
// com os dígitos do CNPJ, para achar a empresa com ou sem pontuação.
function matchesSearch(supplier: SupplierSummary, query: string): boolean {
  const term = query.trim();
  if (!term) return true;
  if (/^[\d./\s-]+$/.test(term)) return supplier.cnpj.replace(/\D/g, "").includes(term.replace(/\D/g, ""));
  return plain(supplier.name).includes(plain(term));
}

function SizeTag({ size }: { size: SupplierSize }) {
  return <span className={`gp-tag ${size === "Demais empresas" ? "is-neutral" : "is-mpe"}`}>{size}</span>;
}

export function GestorPublicoFornecedores() {
  const [filters, setFilters] = useState<SupplierFilters>(EMPTY_FILTERS);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"name" | "size" | "municipality" | "total">("total");
  const [ascending, setAscending] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<SupplierSummary | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const openedFrom = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const municipalities = useMemo(() => getMunicipalitySummaries(filters.year), [filters.year]);
  const suppliers = useMemo(() => getSupplierSummaries(municipalities, filters.year), [municipalities, filters.year]);
  const rows = useMemo(() => suppliers
    .filter((supplier) => (!filters.municipality || supplier.municipalityId === filters.municipality)
      && (!filters.size || supplier.size === filters.size)
      && matchesSearch(supplier, query))
    .sort((a, b) => { const left = a[sort]; const right = b[sort]; const order = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), "pt-BR"); return ascending ? order : -order; }), [suppliers, filters, query, sort, ascending]);

  const sortColumn = (key: typeof sort) => { setSort(key); setAscending(key === sort ? !ascending : key !== "total"); setPage(1); };
  const column = (label: string, key: typeof sort) => <PublicSortHeader active={sort === key} ascending={ascending} onClick={() => sortColumn(key)}>{label}</PublicSortHeader>;

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(firstIndex, firstIndex + pageSize);
  const totalValue = rows.reduce((sum, supplier) => sum + supplier.total, 0);
  const hasFilters = Boolean(query.trim() || filters.municipality || filters.size || filters.year !== EMPTY_FILTERS.year);

  const updateFilters = (patch: Partial<SupplierFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };
  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setQuery("");
    setPage(1);
  };
  const goToPage = (next: number) => {
    setPage(next);
    // Quem clica na paginação está no fim da lista: volta para o começo dela.
    const list = listRef.current;
    if (list && list.getBoundingClientRect().top < 0) list.scrollIntoView({ block: "start" });
  };
  const openSupplier = (event: MouseEvent<HTMLTableRowElement>, supplier: SupplierSummary) => {
    // Quem arrasta o mouse para copiar o nome ou o CNPJ não quer abrir o painel.
    if (event.detail > 0 && window.getSelection()?.toString()) return;
    openedFrom.current = event.currentTarget.querySelector("button");
    setSelected(supplier);
  };

  const clearButton = <button type="button" className="gp-text-button" onClick={clearFilters}><RefreshCw size={15} aria-hidden="true" /> Limpar filtros</button>;

  return <div className="gp-main gp-suppliers-main">
    <PageHeader
      title="Fornecedores"
      description="Substitua buscas manuais por uma visão organizada dos fornecedores e portes empresariais."
      actions={hasFilters ? clearButton : undefined}
    />

    <div className="analysis-filters gp-analysis-filters gp-supplier-filters" role="group" aria-label="Filtros dos fornecedores">
      <div className="analysis-filter-fields">
        <PublicFilterSelect name="fornecedores-municipio" label="Município" allLabel="Todos os municípios" icon="municipality" variant="analysis" value={filters.municipality} options={municipalities.map((item) => ({ value: item.id, label: item.name }))} onValueChange={(value) => updateFilters({ municipality: value })} />
        <PublicFilterSelect name="fornecedores-ano" label="Ano" icon="year" variant="analysis" value={String(filters.year)} options={GESTOR_PUBLICO_YEARS.map((year) => ({ value: String(year), label: String(year) }))} onValueChange={(value) => updateFilters({ year: Number(value) || EMPTY_FILTERS.year })} />
        <PublicFilterSelect name="fornecedores-porte" label="Porte" allLabel="Todos" icon="nature" variant="analysis" value={filters.size} options={SIZES.map((size) => ({ value: size, label: size }))} onValueChange={(value) => updateFilters({ size: value as SupplierFilters["size"] })} />
      </div>
    </div>

    <Card
      className="gp-suppliers-card gp-list-card"
      title={`${count(rows.length)} ${rows.length === 1 ? "fornecedor encontrado" : "fornecedores encontrados"}`}
      description={rows.length ? `Juntos, receberam ${money(totalValue)} em ${filters.year}. Clique em um fornecedor para ver os detalhes.` : undefined}
      actions={<label className="gp-search-field gp-suppliers-search">
        <Search size={18} aria-hidden="true" />
        <span className="gp-sr-only">Buscar fornecedor</span>
        <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar por CNPJ ou razão social" autoComplete="off" />
      </label>}
    >
      <div className="gp-suppliers-list" ref={listRef}>
        {pageRows.length ? <PublicTable>
          <caption className="gp-sr-only">Fornecedores do recorte selecionado</caption>
          <thead>
            <tr>
              {column("Fornecedor", "name")}
              {column("Porte", "size")}
              {column("Município", "municipality")}
              {column("Valor recebido", "total")}
              <th scope="col"><span className="gp-sr-only">Detalhes</span></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((supplier) => <tr key={supplier.id} onClick={(event) => openSupplier(event, supplier)}>
              <th scope="row" className="gp-supplier-name">
                <button type="button" aria-haspopup="dialog">{supplier.name}</button>
                <span>{supplier.cnpj}</span>
              </th>
              <td className="gp-supplier-size">
                <SizeTag size={supplier.size} />
              </td>
              <td className="gp-supplier-city">{supplier.municipality}/{supplier.state}</td>
              <td className="gp-supplier-value is-number"><strong>{money(supplier.total)}</strong></td>
              <td className="gp-supplier-chevron" aria-hidden="true"><ChevronRight size={20} /></td>
            </tr>)}
          </tbody>
        </PublicTable> : <div className="gp-empty gp-suppliers-empty" role="status">
          <Info size={19} aria-hidden="true" />
          <span>Nenhum fornecedor corresponde aos filtros escolhidos.</span>
          {hasFilters && clearButton}
        </div>}
      </div>

      <PublicTablePagination page={currentPage} pageSize={pageSize} total={rows.length} onPageChange={goToPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} label="Paginação dos fornecedores" />
    </Card>

    <Dialog.Root open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="gp-drawer-overlay" />
        {/* Ao abrir, o foco fica no próprio painel (o leitor de tela anuncia o
            título) em vez de cair no botão "Copiar"; ao fechar, volta para a linha. */}
        <Dialog.Content
          ref={drawerRef}
          className="gp-drawer gp-supplier-modal"
          onOpenAutoFocus={(event) => { event.preventDefault(); drawerRef.current?.focus(); }}
          onCloseAutoFocus={(event) => { event.preventDefault(); openedFrom.current?.focus(); }}
        >
          {selected && <SupplierDetail supplier={selected} year={filters.year} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div>;
}

function SupplierDetail({ supplier, year }: { supplier: SupplierSummary; year: number }) {
  const [copied, setCopied] = useState(false);
  const place = `${supplier.municipality}/${supplier.state}`;

  const copyCnpj = async () => {
    try {
      await navigator.clipboard.writeText(supplier.cnpj);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sem permissão de área de transferência: o CNPJ continua visível para copiar à mão.
    }
  };

  return <>
    <header className="gp-drawer-head">
      <div>
        <span className="gp-eyebrow">Fornecedor</span>
        <Dialog.Title>{supplier.name}</Dialog.Title>
        <div className="gp-drawer-cnpj">
          <Dialog.Description>CNPJ {supplier.cnpj}</Dialog.Description>
          <button type="button" className="gp-drawer-copy" onClick={copyCnpj}>
            {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>
      <Dialog.Close className="gp-drawer-close" aria-label="Fechar detalhes"><X size={20} aria-hidden="true" /></Dialog.Close>
    </header>

    <div className="gp-drawer-body">
      <div className="gp-drawer-tags">
        <SizeTag size={supplier.size} />
      </div>

      <div className="gp-drawer-highlight">
        <small>Valor recebido em {year}</small>
        <strong>{money(supplier.total)}</strong>
        <span>Em compras da prefeitura de {place}</span>
      </div>

      <dl className="gp-drawer-list">
        <div><dt>Porte empresarial</dt><dd>{SIZE_LABEL[supplier.size]}{supplier.size !== "Demais empresas" && <small>{supplier.size}</small>}</dd></div>
        <div><dt>Município comprador</dt><dd>{place}</dd></div>
        <div><dt>Natureza da despesa</dt><dd>{natureName(supplier.nature)}</dd></div>
        <div><dt>Municípios atendidos</dt><dd>{count(supplier.municipalitiesServed)} {supplier.municipalitiesServed === 1 ? "município" : "municípios"}</dd></div>
        <div><dt>Atualização</dt><dd>{formatDateBr(supplier.updatedAt)}</dd></div>
      </dl>

      <p className="gp-drawer-note"><Info size={15} aria-hidden="true" /> Dados demonstrativos. Confira na fonte oficial antes de decisões administrativas.</p>
    </div>

    <footer className="gp-drawer-actions">
      <Link className="gp-primary-button" href={`/gestor/municipios/${supplier.municipalityId}`}>Ver {supplier.municipality} <ArrowRight size={16} aria-hidden="true" /></Link>
      <Dialog.Close className="gp-drawer-secondary">Fechar</Dialog.Close>
    </footer>
  </>;
}
