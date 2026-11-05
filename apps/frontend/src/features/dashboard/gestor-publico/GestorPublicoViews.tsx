"use client";

import * as Dialog from "@radix-ui/react-dialog";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { PublicTable, PublicTablePagination, PublicSortHeader } from "@/components/filters/PublicTable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, BarChart3, CheckCircle2, CircleDollarSign, Download, Expand, X, FileBarChart, Filter, Info, MapPinned, RefreshCw, Search, Store, TrendingUp, Users } from "lucide-react";
import { formatDateBr } from "@/features/dashboard/gestor/gestor-domain";
import { PublicFilterSelect } from "@/components/filters/PublicFilterSelect";
import { ExpensesChart, GeneralShareChart, LocalShareChart, MicroenterpriseValueChart, ParticipationChart } from "@/features/public-data/PublicCharts";
import type { StateMap } from "@/features/dashboard/gestor/geo-api";
import {
  ALL_MUNICIPALITIES, GESTOR_PUBLICO_NATURES, GESTOR_PUBLICO_YEARS, getDashboardData, getMunicipalitySummaries, getSupplierSummaries, natureName, type GestorPublicFilters, type NatureCode, type SupplierOrigin, type SupplierSize,
} from "./gestor-publico-data";

const currency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const pct = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export const DEFAULT_GESTOR_FILTERS: GestorPublicFilters = { municipalities: [], year: GESTOR_PUBLICO_YEARS[0], nature: "", origin: "", size: "" };

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: React.ReactNode }) {
  return <header className="gp-page-heading"><div>{eyebrow && <span className="gp-eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{description}</p></div>{actions && <div className="gp-heading-actions">{actions}</div>}</header>;
}

function Metric({ label, value, detail, tone = "blue", icon }: { label: string; value: string; detail: string; tone?: string; icon: React.ReactNode }) {
  return <article className={`gp-metric gp-tone-${tone}`}><span className="gp-metric-icon">{icon}</span><small>{label}</small><strong>{value}</strong><p>{detail}</p></article>;
}

export function Card({ title, description, children, className = "", actions }: { title: string; description?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return <section className={`gp-card ${className}`}><header><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{actions}</header>{children}</section>;
}

function EmptyState({ children }: { children: string }) {
  return <div className="gp-empty" role="status"><Info size={19} /><span>{children}</span></div>;
}

function FilterPanel({ value, onChange, multiMunicipality = true }: { value: GestorPublicFilters; onChange: (next: GestorPublicFilters) => void; multiMunicipality?: boolean }) {
  const municipalities = useMemo(() => getMunicipalitySummaries(value.year), [value.year]);
  const set = <K extends keyof GestorPublicFilters>(key: K, next: GestorPublicFilters[K]) => onChange({ ...value, [key]: next });
  return <section className="gp-filters" aria-label="Filtros da análise">
    <div className="gp-filters-title"><Filter size={18} /><div><strong>Filtros da análise</strong><span>Atualize os indicadores conforme o recorte escolhido.</span></div></div>
    <label className="gp-field gp-field-wide"><span>Município{multiMunicipality ? "s" : ""}</span>{multiMunicipality ? <select multiple value={value.municipalities} onChange={(event) => set("municipalities", Array.from(event.target.selectedOptions, (option) => option.value).filter((id) => id !== ALL_MUNICIPALITIES))}><option value={ALL_MUNICIPALITIES}>Todos os municípios</option>{municipalities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : <select value={value.municipalities[0] ?? ""} onChange={(event) => set("municipalities", event.target.value ? [event.target.value] : [])}><option value="">Todos os municípios</option>{municipalities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</label>
    <label className="gp-field"><span>Período / ano</span><select value={value.year} onChange={(event) => set("year", Number(event.target.value))}>{GESTOR_PUBLICO_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
    <label className="gp-field"><span>Natureza da despesa</span><select value={value.nature} onChange={(event) => set("nature", event.target.value as NatureCode | "")}><option value="">Todas as naturezas</option>{GESTOR_PUBLICO_NATURES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
    <label className="gp-field"><span>Localização do fornecedor</span><select value={value.origin} onChange={(event) => set("origin", event.target.value as SupplierOrigin | "")}><option value="">Todas</option><option>Local</option><option>Regional</option><option>Externa</option></select></label>
    <label className="gp-field"><span>Porte empresarial</span><select value={value.size} onChange={(event) => set("size", event.target.value as SupplierSize | "")}><option value="">Todos os portes</option><option>MEI</option><option>ME</option><option>EPP</option><option>Demais empresas</option></select></label>
  </section>;
}

function BarRows({ rows, valueKey = "value", formatter = currency }: { rows: Array<{ label: string; value: number; meta?: string }>; valueKey?: string; formatter?: (value: number) => string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return <div className="gp-bar-rows">{rows.map((row) => <div className="gp-bar-row" key={`${valueKey}-${row.label}`}><div className="gp-bar-label"><span>{row.label}</span><b>{formatter(row.value)}</b></div><div className="gp-bar-track"><i style={{ width: `${Math.max(2, row.value / max * 100)}%` }} /></div>{row.meta && <small>{row.meta}</small>}</div>)}</div>;
}

function MonthlyBars({ values }: { values: number[] }) {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const max = Math.max(1, ...values);
  return <div className="gp-monthly-bars" role="img" aria-label="Evolução mensal do valor das compras">{values.map((value, index) => <div key={months[index]}><span style={{ height: `${Math.max(4, value / max * 100)}%` }} title={`${months[index]}: ${currency(value)}`} /><small>{months[index]}</small></div>)}</div>;
}

function csvCell(value: string | number): string {
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

function DashboardExportMenu({ data, filters }: { data: ReturnType<typeof getDashboardData>; filters: GestorPublicFilters }) {
  const exportCsv = () => {
    const rows = [
      ["Indicador", "Valor", "Detalhe"],
      ["Valor total de compras", currency(data.totals.total), `Ano ${filters.year}`],
      ["Valor destinado às ME", currency(data.totals.mpeValue), pct(data.totals.mpePercent)],
      ["Compras locais", currency(data.totals.localValue), pct(data.totals.localValue / Math.max(1, data.totals.total) * 100)],
      ["Fornecedores", number(data.totals.suppliers), `${data.totals.municipalities} municípios`],
      ...data.natures.map((item) => [item.label, currency(item.value), `${pct(item.mpePercent)} para ME`]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `dashboard-gestor-publico-${filters.year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <details className="gp-export-menu">
    <summary className="gp-primary-button"><Download size={16} /> Exportar dados</summary>
    <div className="gp-export-options">
      <button type="button" onClick={exportCsv}><Download size={15} /> Indicadores em CSV</button>
      <button type="button" onClick={() => window.print()}><FileBarChart size={15} /> Imprimir / salvar em PDF</button>
    </div>
  </details>;
}

function PublicDashboardFilters({ filters, onChange }: { filters: GestorPublicFilters; onChange: (next: GestorPublicFilters) => void }) {
  const municipalities = getMunicipalitySummaries(filters.year).map((item) => ({ value: item.id, label: item.name }));
  return <form className="analysis-filters gp-analysis-filters" onSubmit={(event) => event.preventDefault()} aria-label="Filtros da análise">
    <div className="analysis-filter-fields">
      <PublicFilterSelect name="municipio" label="Município" allLabel="Todos os municípios" icon="municipality" variant="analysis" value={filters.municipalities[0] ?? ""} options={municipalities} onValueChange={(value) => onChange({ ...filters, municipalities: value ? [value] : [] })} />
      <PublicFilterSelect name="ano" label="Ano" icon="year" variant="analysis" value={String(filters.year)} options={GESTOR_PUBLICO_YEARS.map((year) => ({ value: String(year), label: String(year) }))} onValueChange={(value) => onChange({ ...filters, year: Number(value) || GESTOR_PUBLICO_YEARS[0] })} />
      <PublicFilterSelect name="natureza" label="Natureza da despesa" allLabel="Todas as naturezas" icon="nature" variant="analysis" value={filters.nature} options={GESTOR_PUBLICO_NATURES.map((item) => ({ value: item.code, label: item.label }))} onValueChange={(value) => onChange({ ...filters, nature: value as GestorPublicFilters["nature"] })} />
      <button className="analysis-search-button" type="submit" aria-label="Consultar dados"><Search size={23} /><span>Consultar dados</span></button>
    </div>
  </form>;
}

function PublicKpi({ icon, label, value, detail, accent = false }: { icon: React.ReactNode; label: string; value: string; detail: string; accent?: boolean }) {
  return <article className={accent ? "accent" : ""}><div><span>{icon}</span><small>{label}</small></div><strong>{value}</strong><p>{detail}</p></article>;
}

function AnalysisCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <article className="analysis-chart-card"><header><div><h2>{title}</h2><p>{description}</p></div></header>{children}</article>;
}

function dashboardParticipationRows(data: ReturnType<typeof getDashboardData>) {
  return data.natures.map((item) => ({
    codigo_natureza: item.code,
    nome_natureza: item.label,
    quantidade_licitacoes: 0,
    licitacoes_com_me: 0,
    percentual_licitacoes_com_me: item.mpePercent,
    quantidade_participacoes: 0,
    participacoes_me: 0,
    percentual_participacoes_me: item.mpePercent,
    valor_vencido: String(item.value),
    valor_vencido_me: String(item.mpeValue),
    percentual_valor_vencido_me: item.mpePercent,
  }));
}

function dashboardExpenseRows(data: ReturnType<typeof getDashboardData>) {
  return data.natures.map((item) => ({
    codigo_natureza: item.code,
    nome_natureza: item.label,
    valor_total_dotacao: String(item.value),
    quantidade_dotacoes: 0,
    quantidade_licitacoes: 0,
  }));
}

function NatureFocusChart({ item, total }: { item: ReturnType<typeof getDashboardData>["natures"][number]; total: number }) {
  const share = item.value / Math.max(1, total) * 100;
  const mpeShare = item.mpePercent;
  return <div className="gp-nature-focus" role="img" aria-label={`${item.label}: ${currency(item.value)} no total, ${pct(mpeShare)} destinados a ME`}>
    <div className="gp-nature-focus-header"><div><span>Natureza selecionada</span><strong>{item.label}</strong></div><b>{currency(item.value)}</b></div>
    <div className="gp-nature-focus-track"><i style={{ width: `${Math.min(100, Math.max(2, share))}%` }} /></div>
    <div className="gp-nature-focus-stats"><div><small>Participação no orçamento</small><strong>{pct(share)}</strong></div><div><small>Valor destinado a ME</small><strong>{currency(item.mpeValue)}</strong></div><div><small>Percentual para ME</small><strong>{pct(mpeShare)}</strong></div></div>
    <div className="gp-nature-focus-note"><span className="gp-nature-dot gp-nature-dot-total" /> Valor total <span className="gp-nature-dot gp-nature-dot-mpe" /> ME</div>
  </div>;
}

function SingleNatureMetric({ item, mode }: { item: ReturnType<typeof getDashboardData>["natures"][number]; mode: "value" | "participation" }) {
  const value = mode === "value" ? currency(item.value) : pct(item.mpePercent);
  const label = mode === "value" ? "Valor previsto no orçamento" : "Participação de microempresas";
  const detail = mode === "value" ? "Natureza selecionada nos filtros" : "Percentual de participações de ME nesta natureza";
  return <div className="gp-single-nature-metric"><span>{label}</span><strong>{value}</strong><div className="gp-single-nature-track"><i style={{ width: `${Math.max(3, Math.min(100, mode === "value" ? 100 : item.mpePercent))}%` }} /></div><b>{item.label}</b><small>{detail}</small></div>;
}

function DashboardCearaMap({ data, year, map, onSelect }: { data: ReturnType<typeof getDashboardData>; year: number; map?: StateMap; onSelect?: (item: ReturnType<typeof getDashboardData>["allMunicipalities"][number]) => void }) {
  const [hovered, setHovered] = useState<ReturnType<typeof getDashboardData>["allMunicipalities"][number] | null>(null);
  const max = Math.max(1, ...data.allMunicipalities.map((item) => item.mpePercent));
  const byId = new Map(data.allMunicipalities.map((item) => [item.id, item]));
  const show = (item: ReturnType<typeof getDashboardData>["allMunicipalities"][number]) => setHovered(item);
  const hide = () => setHovered(null);
  return <div className="gp-ceara-map-layout"><div className="gp-ceara-map" role="group" aria-label="Mapa de participação das ME nos municípios do Ceará"><svg viewBox={map ? `0 0 ${map.width} ${map.height}` : "0 0 760 360"}>{map ? map.shapes.map((shape) => { const item = byId.get(shape.ibge); if (!item) return null; const weight = Math.max(0.12, item.mpePercent / max); return <Link href={`/gestor/municipios/${item.id}`} key={shape.ibge} aria-label={`${onSelect ? "Selecionar" : "Abrir detalhes de"} ${item.name}`} onClick={onSelect ? (event) => { event.preventDefault(); onSelect(item); } : undefined} onMouseEnter={() => show(item)} onMouseLeave={hide} onFocus={() => show(item)} onBlur={hide}><path className="gp-ceara-shape gp-ceara-municipality" d={shape.d} style={{ fillOpacity: weight }}><title>{`${item.name}: ${currency(item.mpeValue)} em ME`}</title></path></Link>; }) : <text x="380" y="180" textAnchor="middle">Mapa municipal indisponível</text>}</svg>{hovered && <div className="gp-ceara-tooltip" role="status"><strong>{hovered.name}</strong><span>{currency(hovered.mpeValue)} em ME</span><small>{pct(hovered.mpePercent)} do valor total · {number(hovered.suppliers)} fornecedores</small><em>Passe o mouse em outro município para comparar</em></div>}<div className="gp-ceara-map-legend"><span><i /> Maior participação de ME</span><small>{map ? "Malha municipal do IBGE" : `Dados demonstrativos · ${year}`}</small></div></div></div>;
}

function DashboardMapCard({ data, year, map }: { data: ReturnType<typeof getDashboardData>; year: number; map?: StateMap }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = data.allMunicipalities.find((item) => item.id === selectedId) ?? data.topMunicipalities[0];
  return <Card title="Mapa de participação das ME" description="Explore a participação das ME em cada município." actions={<Dialog.Root>
    <Dialog.Trigger asChild><button type="button" className="gp-map-expand"><Expand size={17} aria-hidden="true" /> Expandir</button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="gp-drawer-overlay" /><Dialog.Content className="gp-map-modal">
      <header className="gp-map-modal-heading"><div><Dialog.Title>Participação das ME no Ceará</Dialog.Title><Dialog.Description>Selecione um município no mapa para consultar seus indicadores de {year}.</Dialog.Description></div><Dialog.Close className="gp-map-close" aria-label="Fechar mapa expandido"><X size={22} /></Dialog.Close></header>
      <div className="gp-map-modal-layout"><DashboardCearaMap data={data} year={year} map={map} onSelect={(item) => setSelectedId(item.id)} />
        <section className="gp-map-information" aria-live="polite" aria-atomic="true">{selected ? <>
          <span className="gp-eyebrow">MUNICÍPIO SELECIONADO</span><h3>{selected.name}</h3><p>{selected.region} · Ceará · {year}</p>
          <dl><div><dt>Participação das ME</dt><dd>{pct(selected.mpePercent)}</dd></div><div><dt>Valor destinado a ME</dt><dd>{currency(selected.mpeValue)}</dd></div><div><dt>Valor total</dt><dd>{currency(selected.total)}</dd></div><div><dt>Compras locais</dt><dd>{pct(selected.localPercent)}</dd></div><div><dt>Fornecedores</dt><dd>{number(selected.suppliers)}</dd></div></dl>
          <Link className="gp-primary-button" href={`/gestor/municipios/${selected.id}`}>Ver detalhes do município <ArrowRight size={16} /></Link>
        </> : <EmptyState>Nenhum município disponível neste recorte.</EmptyState>}</section>
      </div>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>}><DashboardCearaMap data={data} year={year} map={map} /></Card>;
}

function PublicDashboardChartGrid({ data }: { data: ReturnType<typeof getDashboardData> }) {
  const participationRows = dashboardParticipationRows(data);
  const expenseRows = dashboardExpenseRows(data);
  const localPercentage = data.totals.localValue / Math.max(1, data.totals.total) * 100;
  return <div className="analysis-chart-grid gp-analysis-chart-grid">
    <AnalysisCard title="Valor homologado para ME por natureza da despesa" description="Soma dos valores homologados para microempresas em cada tipo de compra.">{data.natures.length === 1 ? <NatureFocusChart item={data.natures[0]} total={data.totals.total} /> : <MicroenterpriseValueChart data={participationRows} />}</AnalysisCard>
    <AnalysisCard title="Participação das microempresas nas compras" description="Compare a participação local com a participação geral das microempresas."><div className="analysis-share-comparison"><div className="analysis-share-item"><h3>Compras com ME locais</h3><LocalShareChart percentage={localPercentage} size={210} /><p>{currency(data.totals.localValue)} em compras locais</p></div><div className="analysis-share-item"><h3>Compras com ME em geral</h3><GeneralShareChart percentage={data.totals.mpePercent} size={210} /><p>{currency(data.totals.mpeValue)} em compras com ME</p></div></div></AnalysisCard>
    <AnalysisCard title="Compras por natureza da despesa" description="Veja o valor previsto no orçamento para cada tipo de compra.">{data.natures.length === 1 ? <SingleNatureMetric item={data.natures[0]} mode="value" /> : <ExpensesChart data={expenseRows} />}</AnalysisCard>
    <AnalysisCard title="Participações de ME por natureza da despesa" description="Percentual de participações de microempresas em cada tipo de compra.">{data.natures.length === 1 ? <SingleNatureMetric item={data.natures[0]} mode="participation" /> : <ParticipationChart data={participationRows} />}</AnalysisCard>
  </div>;
}

export function GestorPublicoDashboard({ cearaMap }: { cearaMap?: StateMap } = {}) {
  const [filters, setFilters] = useState(DEFAULT_GESTOR_FILTERS);
  const data = useMemo(() => getDashboardData(filters), [filters]);
  const selectedName = filters.municipalities.length === 1 ? data.selected[0]?.name ?? "Ceará" : "Ceará";
  return <div className="gp-main gp-analysis-main">
    <section className="analysis-title-row gp-analysis-title-row"><div><h1>Licitações e microempresas em {selectedName}</h1><p>Veja como as compras públicas foram distribuídas entre os sete tipos de despesa e a participação das microempresas.</p></div><div className="gp-analysis-actions"><DashboardExportMenu data={data} filters={filters} />{<button type="button" className="gp-text-button" onClick={() => setFilters(DEFAULT_GESTOR_FILTERS)}><RefreshCw size={15} /> Limpar filtros</button>}</div></section>
    <PublicDashboardFilters filters={filters} onChange={setFilters} />
    <div className="gp-filter-summary"><span>{data.totals.municipalities} municípios analisados</span><span>Ano {filters.year}</span>{filters.nature && <span>{natureName(filters.nature)}</span>}</div>
    <section className="analysis-kpis" aria-label="Indicadores principais">
      <PublicKpi icon={<CircleDollarSign />} label="Valor homologado para ME" value={currency(data.totals.mpeValue)} detail="Soma dos valores de licitações vencidas por microempresas." />
      <PublicKpi icon={<Store />} label="Participações de ME" value={number(data.totals.suppliers)} detail="Registros de participação de microempresas." accent />
      <PublicKpi icon={<MapPinned />} label="Compras com ME locais" value={currency(data.totals.localValue)} detail="Valor destinado a empresas sediadas no próprio município." />
    </section>
    <PublicDashboardChartGrid data={data} />
    <div className="gp-grid gp-grid-2 gp-secondary-dashboard-grid"><DashboardMapCard data={data} year={filters.year} map={cearaMap} /><Card title="Municípios com maior participação de ME" description="Ranking calculado pela fórmula valor de ME ÷ valor total."><div className="gp-ranking">{data.topMunicipalities.map((item, index) => <Link href={`/gestor/municipios/${item.id}`} key={item.id}><b>{String(index + 1).padStart(2, "0")}</b><span>{item.name}<small>{currency(item.mpeValue)} em ME</small></span><strong>{pct(item.mpePercent)}</strong><ArrowRight size={15} /></Link>)}</div></Card></div>
  </div>;
}

function TableHeader({ children }: { children?: React.ReactNode }) { return <th>{children}</th>; }


export function GestorPublicoMunicipios() {
  const router = useRouter();
  const [pageSize, setPageSize] = useState(10);

  const [year, setYear] = useState<number>(GESTOR_PUBLICO_YEARS[0]);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState<"mpePercent" | "localPercent" | "total" | "name" | "mpeValue" | "suppliers" | "updatedAt">(
    "mpePercent"
  );
  const [ascending, setAscending] = useState(false);
  const [page, setPage] = useState(1);

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLocaleLowerCase("pt-BR");

  const normalizedQuery = normalizeText(query);

  const data = useMemo(() => {
    return getMunicipalitySummaries(year)
      .filter((item) => {
        const matchesName = normalizeText(item.name).includes(
          normalizedQuery
        );
        const matchesRegion = !region || item.region === region;

        return matchesName && matchesRegion;
      })
      .sort((a, b) => { const left = a[sort]; const right = b[sort]; const order = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), "pt-BR"); return ascending ? order : -order; });
  }, [normalizedQuery, region, sort, year, ascending]);

  const sortColumn = (key: typeof sort) => { setSort(key); setAscending(key === sort ? !ascending : key === "name"); setPage(1); };
  const column = (label: string, key: typeof sort) => <PublicSortHeader active={sort === key} ascending={ascending} onClick={() => sortColumn(key)}>{label}</PublicSortHeader>;

  const pageCount = Math.max(1, Math.ceil(data.length / pageSize));
  const currentPage = Math.min(page, pageCount);

  const pageData = data.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const changePage = (nextPage: number) => {
    setPage(Math.max(1, Math.min(nextPage, pageCount)));

    document
      .querySelector(".gp-table-wrap")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openMunicipality = (id: string) => {
    router.push(`/gestor/municipios/${id}`);
  };

  return (
    <div className="gp-main gp-municipalities-page">
      <PageHeader
        title="Todos os municípios em uma visão"
        description="Pesquise e ordene os municípios para consultar seus resultados."

      />

      <div className="analysis-filters gp-analysis-filters gp-municipality-filters"><div className="analysis-filter-fields">
        <label className="gp-search-field">
          <Search size={17} />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Pesquisar município"
            aria-label="Pesquisar município"
          />
        </label>

        <PublicFilterSelect name="municipios-regiao" label="Região" allLabel="Todas as regiões" icon="municipality" variant="analysis" value={region} options={["Litoral", "Sertão", "Cariri", "Centro-Norte"].map((value) => ({ value, label: value }))} onValueChange={(value) => { setRegion(value); setPage(1); }} />
        <PublicFilterSelect name="municipios-ano" label="Ano" icon="year" variant="analysis" value={String(year)} options={GESTOR_PUBLICO_YEARS.map((value) => ({ value: String(value), label: String(value) }))} onValueChange={(value) => { setYear(Number(value)); setPage(1); }} />
        <PublicFilterSelect name="municipios-ordem" label="Ordenar por" icon="nature" variant="analysis" value={sort} options={[{ value: "mpePercent", label: "Participação de ME" }, { value: "localPercent", label: "Compras locais" }, { value: "total", label: "Valor total" }]} onValueChange={(value) => { setSort(value as typeof sort); setAscending(false); setPage(1); }} />
      </div></div>

      <Card
        className="gp-list-card"
        title={`${data.length} municípios encontrados`}
        description="Clique em um município para consultar seus indicadores e fornecedores."
      >
        <div className="gp-table-wrap">
          <PublicTable className="gp-city-data-table">
            <thead>
              <tr>
                {column("Município", "name")}
                {column("Valor total", "total")}
                {column("Valor para ME", "mpeValue")}
                {column("% ME", "mpePercent")}
                {column("% locais", "localPercent")}
                {column("Fornecedores", "suppliers")}
                {column("Atualização", "updatedAt")}
                <TableHeader />
              </tr>
            </thead>

            <tbody>
              {pageData.map((item) => (
                <tr
                  key={item.id}
                  className="gp-clickable-row"
                  role="link"
                  tabIndex={0}
                  aria-label={`Ver detalhes de ${item.name}`}
                  onClick={(event) => {
                    if (
                      (event.target as HTMLElement).closest(
                        "a, input, button"
                      )
                    ) {
                      return;
                    }

                    openMunicipality(item.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;

                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openMunicipality(item.id);
                    }
                  }}
                >

                  <td>
                    <Link
                      className="gp-table-link"
                      href={`/gestor/municipios/${item.id}`}
                    >
                      {item.name}
                    </Link>
                    <small>{item.region}</small>
                  </td>

                  <td>{currency(item.total)}</td>
                  <td>{currency(item.mpeValue)}</td>

                  <td>
                    <strong>{pct(item.mpePercent)}</strong>
                  </td>

                  <td>{pct(item.localPercent)}</td>
                  <td>{number(item.suppliers)}</td>
                  <td>{formatDateBr(item.updatedAt)}</td>

                  <td>
                    <Link
                      className="gp-municipality-details-link"
                      href={`/gestor/municipios/${item.id}`}
                      aria-label={`Ver detalhes de ${item.name}`}
                    >
                      <ArrowRight size={17} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </PublicTable>

          {!data.length && (
            <EmptyState>
              Nenhum município corresponde aos filtros escolhidos.
            </EmptyState>
          )}
        </div>

        <PublicTablePagination page={currentPage} pageSize={pageSize} total={data.length} onPageChange={changePage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} label="Paginação dos municípios" />
      </Card>
    </div>
  );
}

const MUNICIPALITY_HISTORY_YEARS = [...GESTOR_PUBLICO_YEARS].sort(
  (a, b) => a - b,
);

type MunicipalityNatureHistoryRow = {
  code: NatureCode;
  label: string;
  values: number[];
};

const HistoryChart = dynamic(() => import("react-apexcharts"), { ssr: false });

function MunicipalityNatureHistoryChart({ rows, years }: { rows: MunicipalityNatureHistoryRow[]; years: number[] }) {
  const [selected, setSelected] = useState<string>(rows[0]?.code ?? "");
  const row = rows.find((item) => item.code === selected) ?? rows[0];
  const options: ApexOptions = {
    chart: { type: "area", toolbar: { show: false }, fontFamily: "inherit", zoom: { enabled: false } },
    colors: ["#11169b"], stroke: { curve: "smooth", width: 3 },
    fill: { type: "gradient", gradient: { opacityFrom: .28, opacityTo: .02 } },
    dataLabels: { enabled: false }, markers: { size: 5, strokeWidth: 3, hover: { size: 7 } },
    grid: { borderColor: "#e8eef3", strokeDashArray: 4, padding: { left: 12, right: 18 } },
    xaxis: { categories: years.map(String), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: "#64748b", fontSize: "13px" } }, tooltip: { enabled: false } },
    yaxis: { min: 0, tickAmount: 4, labels: { formatter: (value) => `R$ ${new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`, style: { colors: "#64748b" } } },
    tooltip: { y: { formatter: currency } },
    responsive: [{ breakpoint: 600, options: { chart: { height: 280 }, grid: { padding: { left: 0, right: 8 } } } }],
  };
  return <div className="gp-history-area">
    <PublicFilterSelect name="historico-natureza" label="Natureza da despesa" icon="nature" variant="analysis" value={row?.code ?? ""} options={rows.map((item) => ({ value: item.code, label: item.label }))} onValueChange={setSelected} />
    <div className="gp-history-year-values">{years.map((year, index) => <div key={year}><span>{year}</span><strong>{currency(row?.values[index] ?? 0)}</strong></div>)}</div>
    <HistoryChart type="area" height={320} options={options} series={[{ name: row?.label ?? "Valor", data: row?.values ?? [] }]} />
  </div>;
}


export function GestorPublicoMunicipioDetail({ id }: { id: string }) {
  const year = GESTOR_PUBLICO_YEARS[0];

  const summary = useMemo(
    () => getMunicipalitySummaries(year).find((item) => item.id === id),
    [id, year],
  );

  const historicalSummaries = useMemo(
    () =>
      MUNICIPALITY_HISTORY_YEARS.map((historyYear) =>
        getMunicipalitySummaries(historyYear).find(
          (item) => item.id === id,
        ),
      ),
    [id],
  );

  const historyRows = useMemo(
    () =>
      GESTOR_PUBLICO_NATURES.map((nature) => ({
        code: nature.code,
        label: nature.label,
        values: historicalSummaries.map(
          (item) => item?.natures[nature.code] ?? 0,
        ),
      })),
    [historicalSummaries],
  );

  const allSuppliers = useMemo(
    () => (summary ? getSupplierSummaries([summary], year) : []),
    [summary, year],
  );

  const suppliers = useMemo(
    () =>
      [...allSuppliers]
        .sort((a, b) => b.total - a.total)
        .slice(0, 8),
    [allSuppliers],
  );

  const natureRows = useMemo(
    () =>
      summary
        ? GESTOR_PUBLICO_NATURES.map((item) => ({
            label: item.label,
            value: summary.natures[item.code],
            meta: `${pct(
              summary.total > 0
                ? (summary.natures[item.code] / summary.total) * 100
                : 0,
            )} do total`,
          }))
        : [],
    [summary],
  );

  const originRows = useMemo(() => {
    const origins: SupplierOrigin[] = [
      "Local",
      "Regional",
      "Externa",
    ];

    return origins
      .map((origin) => {
        const matchingSuppliers = allSuppliers.filter(
          (supplier) => supplier.origin === origin,
        );

        return {
          label: origin,
          value: matchingSuppliers.reduce(
            (total, supplier) => total + supplier.total,
            0,
          ),
          meta: `${number(matchingSuppliers.length)} fornecedores`,
        };
      })
      .filter((item) => item.value > 0);
  }, [allSuppliers]);

  if (!summary) {
    return (
      <div className="gp-main">
        <EmptyState>
          Município não encontrado na base demonstrativa.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="gp-main gp-municipality-detail">
      <PageHeader
        title={summary.name}
        description={`Detalhamento das compras públicas, fornecedores e participação das ME em ${summary.name}.`}

      />

      <Link className="gp-back-link" href="/gestor/municipios">
        ← Voltar para municípios
      </Link>

      <section className="gp-metrics gp-metrics-4">
        <Metric
          label="Compras analisadas"
          value={currency(summary.total)}
          detail="Valor total no período"
          icon={<BarChart3 />}
        />

        <Metric
          label="Valor para ME"
          value={currency(summary.mpeValue)}
          detail={`${pct(summary.mpePercent)} do total`}
          tone="teal"
          icon={<TrendingUp />}
        />

        <Metric
          label="Compras locais"
          value={pct(summary.localPercent)}
          detail={currency(summary.localValue)}
          tone="green"
          icon={<CheckCircle2 />}
        />

        <Metric
          label="Fornecedores"
          value={number(summary.suppliers)}
          detail="Empresas identificadas"
          tone="purple"
          icon={<Users />}
        />
      </section>

      <Card
        title="Evolução histórica por natureza"
        description="Selecione uma natureza para acompanhar seus valores ao longo dos anos."
        className="gp-municipality-history-card"
      >
        <MunicipalityNatureHistoryChart
          rows={historyRows}
          years={MUNICIPALITY_HISTORY_YEARS}
        />
        <p className="gp-history-source-note">
          <Info size={14} />
          Série demonstrativa do protótipo. Os valores não representam
          registros oficiais.
        </p>
      </Card>

      <div className="gp-grid gp-grid-2">
        <Card
          title="Compras por natureza da despesa"
          description={`Distribuição dos valores por categoria em ${year}.`}
        >
          <BarRows rows={natureRows} />
        </Card>

        <Card
          title="Evolução mensal"
          description={`Distribuição mensal do valor das compras em ${year}.`}
        >
          <MonthlyBars values={summary.monthly} />
        </Card>

        <Card
          title="Origem dos fornecedores"
          description="Distribuição dos valores conforme a localização dos fornecedores identificados."
        >
          {originRows.length ? (
            <BarRows rows={originRows} />
          ) : (
            <EmptyState>
              Não há fornecedores classificados por origem neste período.
            </EmptyState>
          )}
        </Card>

        <Card
          title="Fornecedores contratados"
          description="Fornecedores com maiores valores identificados no município."
        >
          {suppliers.length ? (
            <div className="gp-mini-list">
              {suppliers.map((supplier) => (
                <div key={supplier.id}>
                  <span>
                    {supplier.name}
                    <small>
                      {supplier.size} · {supplier.origin}
                    </small>
                  </span>
                  <strong>{currency(supplier.total)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>
              Nenhum fornecedor identificado neste período.
            </EmptyState>
          )}
        </Card>

        <Card
          title="Informações do município"
          description="Identificação e atualização do recorte consultado."
        >
          <dl className="gp-definition-list">
            <div>
              <dt>Município</dt>
              <dd>{summary.name}/CE</dd>
            </div>
            <div>
              <dt>Período</dt>
              <dd>{year}</dd>
            </div>
            <div>
              <dt>Fonte</dt>
              <dd>Base demonstrativa do protótipo</dd>
            </div>
            <div>
              <dt>Última atualização</dt>
              <dd>{formatDateBr(summary.updatedAt)}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}


export function GestorPublicoDiagnostico() {
  const [year, setYear] = useState<number>(GESTOR_PUBLICO_YEARS[0]);
  const data = useMemo(() => getDashboardData({ ...DEFAULT_GESTOR_FILTERS, year }), [year]);
  return <div className="gp-main"><PageHeader eyebrow="DIAGNÓSTICO TERRITORIAL" title="Onde estão os maiores desafios?" description="Leituras para entender a presença das ME, a concentração de fornecedores e a circulação de recursos no território." actions={<label className="gp-year-picker"><span>Ano</span><select value={year} onChange={(event) => setYear(Number(event.target.value))}>{GESTOR_PUBLICO_YEARS.map((item) => <option key={item}>{item}</option>)}</select></label>} /><div className="gp-diagnostic-grid gp-diagnostic-grid-large">{data.diagnostics.map((item) => <article className={`gp-diagnostic gp-diagnostic-${item.tone}`} key={item.title}><small>{item.title}</small><strong>{item.value}</strong><p>{item.description}</p><span>Indicador calculado sobre {year}</span></article>)}</div><div className="gp-grid gp-grid-2"><Card title="Ranking de participação das ME" description="Municípios com maior percentual de compras destinadas às ME."><BarRows rows={data.topMunicipalities.map((item) => ({ label: item.name, value: item.mpePercent, meta: `${pct(item.mpePercent)} · ${currency(item.mpeValue)}` }))} formatter={pct} /></Card><Card title="Naturezas que movimentam a economia" description="Categorias com maior valor comprado no conjunto dos municípios."><BarRows rows={data.natures.map((item) => ({ label: item.label, value: item.value, meta: `${pct(item.mpePercent)} para ME` }))} /></Card></div><p className="gp-source-note"><Info size={15} /> O diagnóstico apresenta padrões dos dados e não substitui análise técnica, jurídica ou orçamentária.</p></div>;
}
