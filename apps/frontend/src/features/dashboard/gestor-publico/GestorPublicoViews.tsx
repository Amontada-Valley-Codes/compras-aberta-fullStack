"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BarChart3, CheckCircle2, CircleDollarSign, Download, FileBarChart, Filter, Info, MapPinned, Printer, RefreshCw, Search, Store, TrendingUp, Users } from "lucide-react";
import { formatDateBr } from "@/features/dashboard/gestor/gestor-domain";
import { PublicFilterSelect } from "@/components/filters/PublicFilterSelect";
import { ExpensesChart, GeneralShareChart, LocalShareChart, MicroenterpriseValueChart, ParticipationChart } from "@/features/public-data/PublicCharts";
import type { StateMap } from "@/features/dashboard/gestor/geo-api";
import {
  ALL_MUNICIPALITIES, GESTOR_PUBLICO_NATURES, GESTOR_PUBLICO_YEARS, getDashboardData, getMunicipalitySummaries, getSupplierSummaries, natureName, type GestorPublicFilters, type NatureCode, type SupplierOrigin, type SupplierSize,
} from "./gestor-publico-data";

const currency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const number = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const pct = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export const DEFAULT_GESTOR_FILTERS: GestorPublicFilters = { municipalities: [], year: GESTOR_PUBLICO_YEARS[0], nature: "", origin: "", size: "" };

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return <header className="gp-page-heading"><div><span className="gp-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className="gp-heading-actions">{actions}</div>}</header>;
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

type ReportSections = { summary: boolean; methodology: boolean; natures: boolean; geography: boolean; suppliers: boolean; charts: boolean };
const DEFAULT_REPORT_SECTIONS: ReportSections = { summary: true, methodology: true, natures: true, geography: true, suppliers: false, charts: true };

function ReportMunicipalityPicker({ value, year, onChange }: { value: string[]; year: number; onChange: (value: string[]) => void }) {
  const municipalities = useMemo(() => getMunicipalitySummaries(year), [year]);
  const [search, setSearch] = useState("");
  const visibleMunicipalities = municipalities.filter((item) => item.name.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")));
  const allSelected = value.length === 0;
  return <details className="gp-report-municipality-picker"><summary className="public-filter-trigger"><MapPinned className="public-filter-leading" aria-hidden="true" /><span className="public-filter-copy"><small>Municípios</small><span className="public-filter-value">{allSelected ? "Todos os municípios" : `${value.length} selecionado${value.length === 1 ? "" : "s"}`}</span></span><span className="gp-report-chevron">⌄</span></summary><div className="gp-report-municipality-options"><label className="gp-report-municipality-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar município" aria-label="Buscar município" /></label><label><input type="checkbox" checked={allSelected} onChange={() => onChange([])} /> Todos os municípios</label>{visibleMunicipalities.map((item) => <label key={item.id}><input type="checkbox" checked={value.includes(item.id)} onChange={() => onChange(value.includes(item.id) ? value.filter((id) => id !== item.id) : [...value, item.id])} /> {item.name}</label>)}{!visibleMunicipalities.length && <span className="gp-report-municipality-empty">Nenhum município encontrado.</span>}</div></details>;
}

function ReportFilters({ filters, onChange }: { filters: GestorPublicFilters; onChange: (next: GestorPublicFilters) => void }) {
  const municipalities = getMunicipalitySummaries(filters.year).map((item) => ({ value: item.id, label: item.name }));
  return <div className="analysis-filters gp-analysis-filters gp-report-filters" aria-label="Filtros do relatório"><div className="analysis-filter-fields"><ReportMunicipalityPicker value={filters.municipalities} year={filters.year} onChange={(municipalitiesValue) => onChange({ ...filters, municipalities: municipalitiesValue })} /><PublicFilterSelect name="relatorio-ano" label="Ano" icon="year" variant="analysis" value={String(filters.year)} options={GESTOR_PUBLICO_YEARS.map((year) => ({ value: String(year), label: String(year) }))} onValueChange={(value) => onChange({ ...filters, year: Number(value) || GESTOR_PUBLICO_YEARS[0] })} /><PublicFilterSelect name="relatorio-natureza" label="Natureza da despesa" allLabel="Todas as naturezas" icon="nature" variant="analysis" value={filters.nature} options={GESTOR_PUBLICO_NATURES.map((item) => ({ value: item.code, label: item.label }))} onValueChange={(value) => onChange({ ...filters, nature: value as GestorPublicFilters["nature"] })} /><PublicFilterSelect name="relatorio-origem" label="Origem do fornecedor" allLabel="Todas as origens" icon="nature" variant="analysis" value={filters.origin} options={["Local", "Regional", "Externa"].map((item) => ({ value: item, label: item }))} onValueChange={(value) => onChange({ ...filters, origin: value as GestorPublicFilters["origin"] })} /><PublicFilterSelect name="relatorio-porte" label="Porte empresarial" allLabel="Todos os portes" icon="nature" variant="analysis" value={filters.size} options={["MEI", "ME", "EPP", "Demais empresas"].map((item) => ({ value: item, label: item }))} onValueChange={(value) => onChange({ ...filters, size: value as GestorPublicFilters["size"] })} /></div><p className="gp-report-filter-note">{municipalities.length} municípios disponíveis · selecione um ou vários para montar o documento.</p></div>;
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

function resetFilters(filters: GestorPublicFilters) {
  return <button type="button" className="gp-text-button" onClick={() => window.location.assign("/gestor")}><RefreshCw size={15} /> Limpar filtros</button>;
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
      ["Valor destinado às MPEs", currency(data.totals.mpeValue), pct(data.totals.mpePercent)],
      ["Compras locais", currency(data.totals.localValue), pct(data.totals.localValue / Math.max(1, data.totals.total) * 100)],
      ["Fornecedores", number(data.totals.suppliers), `${data.totals.municipalities} municípios`],
      ...data.natures.map((item) => [item.label, currency(item.value), `${pct(item.mpePercent)} para MPEs`]),
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
  return <div className="gp-nature-focus" role="img" aria-label={`${item.label}: ${currency(item.value)} no total, ${pct(mpeShare)} destinados a MPEs`}>
    <div className="gp-nature-focus-header"><div><span>Natureza selecionada</span><strong>{item.label}</strong></div><b>{currency(item.value)}</b></div>
    <div className="gp-nature-focus-track"><i style={{ width: `${Math.min(100, Math.max(2, share))}%` }} /></div>
    <div className="gp-nature-focus-stats"><div><small>Participação no orçamento</small><strong>{pct(share)}</strong></div><div><small>Valor destinado a MPEs</small><strong>{currency(item.mpeValue)}</strong></div><div><small>Percentual para MPEs</small><strong>{pct(mpeShare)}</strong></div></div>
    <div className="gp-nature-focus-note"><span className="gp-nature-dot gp-nature-dot-total" /> Valor total <span className="gp-nature-dot gp-nature-dot-mpe" /> MPEs</div>
  </div>;
}

function SingleNatureMetric({ item, mode }: { item: ReturnType<typeof getDashboardData>["natures"][number]; mode: "value" | "participation" }) {
  const value = mode === "value" ? currency(item.value) : pct(item.mpePercent);
  const label = mode === "value" ? "Valor previsto no orçamento" : "Participação de microempresas";
  const detail = mode === "value" ? "Natureza selecionada nos filtros" : "Percentual de participações de MPEs nesta natureza";
  return <div className="gp-single-nature-metric"><span>{label}</span><strong>{value}</strong><div className="gp-single-nature-track"><i style={{ width: `${Math.max(3, Math.min(100, mode === "value" ? 100 : item.mpePercent))}%` }} /></div><b>{item.label}</b><small>{detail}</small></div>;
}

function DashboardCearaMap({ data, year, map }: { data: ReturnType<typeof getDashboardData>; year: number; map?: StateMap }) {
  const [hovered, setHovered] = useState<ReturnType<typeof getDashboardData>["allMunicipalities"][number] | null>(null);
  const cities = data.allMunicipalities.slice().sort((a, b) => b.mpeValue - a.mpeValue).slice(0, 30);
  const max = Math.max(1, ...cities.map((item) => item.mpeValue));
  const byId = new Map(data.allMunicipalities.map((item) => [item.id, item]));
  const show = (item: ReturnType<typeof getDashboardData>["allMunicipalities"][number]) => setHovered(item);
  const hide = () => setHovered(null);
  return <div className="gp-ceara-map-layout"><div className="gp-ceara-map" role="img" aria-label="Mapa do Ceará com os municípios que concentram maior valor destinado a micro e pequenas empresas"><svg viewBox={map ? `0 0 ${map.width} ${map.height}` : "0 0 760 360"} aria-hidden="true">{map ? map.shapes.map((shape) => { const item = byId.get(shape.ibge); if (!item) return null; const weight = Math.max(0.12, item.mpeValue / max); return <Link href={`/gestor/municipios/${item.id}`} key={shape.ibge} aria-label={`Abrir detalhes de ${item.name}`} onMouseEnter={() => show(item)} onMouseLeave={hide} onFocus={() => show(item)} onBlur={hide}><path className="gp-ceara-shape gp-ceara-municipality" d={shape.d} style={{ fillOpacity: weight }}><title>{`${item.name}: ${currency(item.mpeValue)} em MPEs`}</title></path></Link>; }) : <><path className="gp-ceara-shape" d="M74 91 142 47 238 34 342 49 433 33 540 61 654 113 716 189 675 268 590 302 510 331 410 312 309 335 211 304 122 319 51 266 28 185Z" />{cities.map((item, index) => { const x = 92 + (index % 8) * 82 + (index % 3) * 5; const y = 82 + Math.floor(index / 8) * 82 + (index % 4) * 5; const size = 4 + Math.sqrt(item.mpeValue / max) * 10; return <Link href={`/gestor/municipios/${item.id}`} key={item.id} className="gp-ceara-point" style={{ left: `${x / 7.6}%`, top: `${y / 3.6}%`, width: `${size * 2}px`, height: `${size * 2}px` }} onMouseEnter={() => show(item)} onMouseLeave={hide} onFocus={() => show(item)} onBlur={hide} aria-label={`Abrir detalhes de ${item.name}`}><span /></Link>; })}</>}</svg>{map && <div className="gp-ceara-map-points">{cities.slice(0, 30).map((item) => { const shape = map.shapes.find((candidate) => candidate.ibge === item.id); if (!shape) return null; const size = 7 + Math.sqrt(item.mpeValue / max) * 7; return <Link href={`/gestor/municipios/${item.id}`} key={item.id} className="gp-ceara-point" style={{ left: `${shape.cx / map.width * 100}%`, top: `${shape.cy / map.height * 100}%`, width: `${size * 2}px`, height: `${size * 2}px` }} onMouseEnter={() => show(item)} onMouseLeave={hide} onFocus={() => show(item)} onBlur={hide} aria-label={`Abrir detalhes de ${item.name}`}><span /></Link>; })}</div>}{hovered && <div className="gp-ceara-tooltip" role="status"><strong>{hovered.name}</strong><span>{currency(hovered.mpeValue)} em MPEs</span><small>{pct(hovered.mpePercent)} do valor total · {number(hovered.suppliers)} fornecedores</small><em>Passe o mouse em outro ponto para comparar</em></div>}<div className="gp-ceara-map-legend"><span><i /> Maior participação de MPEs</span><small>{map ? "Malha municipal do IBGE" : `Dados demonstrativos · ${year}`}</small></div></div><div className="gp-map-ranking"><h3>Municípios em destaque</h3>{cities.slice(0, 6).map((item, index) => <Link href={`/gestor/municipios/${item.id}`} key={item.id} onMouseEnter={() => show(item)} onMouseLeave={hide} onFocus={() => show(item)} onBlur={hide}><b>{String(index + 1).padStart(2, "0")}</b><span>{item.name}<small>{currency(item.mpeValue)} em MPEs</small></span><strong>{pct(item.mpePercent)}</strong><ArrowRight size={15} /></Link>)}</div></div>;
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
    <section className="analysis-title-row gp-analysis-title-row"><div><h1>Licitações e microempresas em {selectedName}</h1><p>Veja como as compras públicas foram distribuídas entre os sete tipos de despesa e a participação das microempresas.</p></div><div className="gp-analysis-actions"><DashboardExportMenu data={data} filters={filters} />{resetFilters(filters)}</div></section>
    <PublicDashboardFilters filters={filters} onChange={setFilters} />
    <div className="gp-filter-summary"><span>{data.totals.municipalities} municípios analisados</span><span>Ano {filters.year}</span>{filters.nature && <span>{natureName(filters.nature)}</span>}</div>
    <section className="analysis-kpis" aria-label="Indicadores principais">
      <PublicKpi icon={<CircleDollarSign />} label="Valor homologado para ME" value={currency(data.totals.mpeValue)} detail="Soma dos valores de licitações vencidas por microempresas." />
      <PublicKpi icon={<Store />} label="Participações de ME" value={number(data.totals.suppliers)} detail="Registros de participação de microempresas." accent />
      <PublicKpi icon={<MapPinned />} label="Compras com ME locais" value={currency(data.totals.localValue)} detail="Valor destinado a empresas sediadas no próprio município." />
    </section>
    <PublicDashboardChartGrid data={data} />
    <div className="gp-grid gp-grid-2 gp-secondary-dashboard-grid"><Card title="Mapa de participação das MPEs" description="Acesse o detalhe de cada município diretamente pelo mapa."><DashboardCearaMap data={data} year={filters.year} map={cearaMap} /></Card><Card title="Municípios com maior participação de MPEs" description="Ranking calculado pela fórmula valor de MPEs ÷ valor total."><div className="gp-ranking">{data.topMunicipalities.map((item, index) => <Link href={`/gestor/municipios/${item.id}`} key={item.id}><b>{String(index + 1).padStart(2, "0")}</b><span>{item.name}<small>{currency(item.mpeValue)} em MPEs</small></span><strong>{pct(item.mpePercent)}</strong><ArrowRight size={15} /></Link>)}</div></Card></div>
    <p className="gp-source-note"><Info size={15} /> Dados demonstrativos centralizados para o protótipo do Gestor Público. A integração definitiva depende dos serviços de dados do backend.</p>
  </div>;
}

function TableHeader({ children }: { children?: React.ReactNode }) { return <th>{children}</th>; }

export function GestorPublicoMunicipios() {
  const [year, setYear] = useState<number>(GESTOR_PUBLICO_YEARS[0]);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState<"mpePercent" | "localPercent" | "total">("mpePercent");
  const [selected, setSelected] = useState<string[]>([]);
  const data = useMemo(() => getMunicipalitySummaries(year).filter((item) => item.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")) && (!region || item.region === region)).sort((a, b) => b[sort] - a[sort]), [query, region, sort, year]);
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  return <div className="gp-main"><PageHeader eyebrow="MUNICÍPIOS" title="Todos os municípios em uma visão" description="Pesquise, ordene e selecione municípios para comparar seus resultados." actions={selected.length > 1 ? <Link className="gp-primary-button" href={`/gestor/comparativos?municipios=${selected.join(",")}`}>Comparar selecionados <ArrowRight size={16} /></Link> : undefined} />
    <div className="gp-list-tools"><label className="gp-search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar município" /></label><label className="gp-inline-field"><span>Região</span><select value={region} onChange={(event) => setRegion(event.target.value)}><option value="">Todas</option><option>Litoral</option><option>Sertão</option><option>Cariri</option><option>Centro-Norte</option></select></label><label className="gp-inline-field"><span>Período</span><select value={year} onChange={(event) => setYear(Number(event.target.value))}>{GESTOR_PUBLICO_YEARS.map((item) => <option key={item}>{item}</option>)}</select></label><label className="gp-inline-field"><span>Ordenar por</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="mpePercent">Participação de MPEs</option><option value="localPercent">Compras locais</option><option value="total">Valor total</option></select></label></div>
    <Card title={`${data.length} municípios encontrados`} description="Selecione dois ou mais para abrir um comparativo. Clique em qualquer área da linha para ver o município."><div className="gp-table-wrap"><table className="gp-table"><thead><tr><TableHeader><span className="gp-sr-only">Selecionar</span></TableHeader><TableHeader>Município</TableHeader><TableHeader>Valor total</TableHeader><TableHeader>Valor para MPEs</TableHeader><TableHeader>% MPEs</TableHeader><TableHeader>% locais</TableHeader><TableHeader>Fornecedores</TableHeader><TableHeader>Atualização</TableHeader><TableHeader /></tr></thead><tbody>{data.map((item) => <tr key={item.id} className="gp-clickable-row" role="link" tabIndex={0} onClick={(event) => { if ((event.target as HTMLElement).closest("a,input,button")) return; window.location.href = `/gestor/municipios/${item.id}`; }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); window.location.href = `/gestor/municipios/${item.id}`; } }}><td><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} aria-label={`Selecionar ${item.name}`} /></td><td><Link className="gp-table-link" href={`/gestor/municipios/${item.id}`}>{item.name}</Link><small>{item.region}</small></td><td>{currency(item.total)}</td><td>{currency(item.mpeValue)}</td><td><strong>{pct(item.mpePercent)}</strong></td><td>{pct(item.localPercent)}</td><td>{number(item.suppliers)}</td><td>{formatDateBr(item.updatedAt)}</td><td><Link href={`/gestor/municipios/${item.id}`} aria-label={`Ver detalhes de ${item.name}`}><ArrowRight size={17} /></Link></td></tr>)}</tbody></table>{!data.length && <EmptyState>Nenhum município corresponde aos filtros escolhidos.</EmptyState>}</div></Card>
  </div>;
}

export function GestorPublicoMunicipioDetail({ id }: { id: string }) {
  const [year, setYear] = useState<number>(GESTOR_PUBLICO_YEARS[0]);
  const summary = useMemo(() => getMunicipalitySummaries(year).find((item) => item.id === id), [id, year]);
  if (!summary) return <div className="gp-main"><EmptyState>Município não encontrado na base demonstrativa.</EmptyState></div>;
  const natureRows = GESTOR_PUBLICO_NATURES.map((item) => ({ label: item.label, value: summary.natures[item.code], meta: `${pct(summary.natures[item.code] / summary.total * 100)} do total` }));
  const suppliers = getSupplierSummaries([summary], year).sort((a, b) => b.total - a.total).slice(0, 8);
  return <div className="gp-main"><PageHeader eyebrow={`MUNICÍPIO • ${year}`} title={summary.name} description={`Detalhamento das compras públicas, fornecedores e participação das MPEs em ${summary.name}.`} actions={<label className="gp-year-picker"><span>Ano</span><select value={year} onChange={(event) => setYear(Number(event.target.value))}>{GESTOR_PUBLICO_YEARS.map((item) => <option key={item}>{item}</option>)}</select></label>} />
    <Link className="gp-back-link" href="/gestor/municipios">← Voltar para municípios</Link>
    <section className="gp-metrics gp-metrics-4"><Metric label="Compras analisadas" value={currency(summary.total)} detail="Valor total no período" icon={<BarChart3 />} /><Metric label="Valor para MPEs" value={currency(summary.mpeValue)} detail={`${pct(summary.mpePercent)} do total`} tone="teal" icon={<TrendingUp />} /><Metric label="Compras locais" value={pct(summary.localPercent)} detail={currency(summary.localValue)} tone="green" icon={<CheckCircle2 />} /><Metric label="Fornecedores" value={number(summary.suppliers)} detail="Empresas identificadas" tone="purple" icon={<Users />} /></section>
    <div className="gp-grid gp-grid-2"><Card title="Compras por natureza da despesa" description="Valor total movimentado em cada categoria."><BarRows rows={natureRows} /></Card><Card title="Evolução histórica" description="Valor mensal homologado no período selecionado."><MonthlyBars values={summary.monthly} /></Card><Card title="Fornecedores contratados" description="Maiores valores identificados no município."><div className="gp-mini-list">{suppliers.map((supplier) => <div key={supplier.id}><span>{supplier.name}<small>{supplier.size} · {supplier.origin}</small></span><strong>{currency(supplier.total)}</strong></div>)}</div></Card><Card title="Origem e atualização dos dados" description="Informações para conferir o recorte exibido."><dl className="gp-definition-list"><div><dt>Município</dt><dd>{summary.name}/CE</dd></div><div><dt>Período</dt><dd>{year}</dd></div><div><dt>Fonte demonstrativa</dt><dd>Dados públicos municipais</dd></div><div><dt>Última atualização</dt><dd>{formatDateBr(summary.updatedAt)}</dd></div></dl></Card></div>
  </div>;
}

export function GestorPublicoDiagnostico() {
  const [year, setYear] = useState<number>(GESTOR_PUBLICO_YEARS[0]);
  const data = useMemo(() => getDashboardData({ ...DEFAULT_GESTOR_FILTERS, year }), [year]);
  return <div className="gp-main"><PageHeader eyebrow="DIAGNÓSTICO TERRITORIAL" title="Onde estão os maiores desafios?" description="Leituras para entender a presença das MPEs, a concentração de fornecedores e a circulação de recursos no território." actions={<label className="gp-year-picker"><span>Ano</span><select value={year} onChange={(event) => setYear(Number(event.target.value))}>{GESTOR_PUBLICO_YEARS.map((item) => <option key={item}>{item}</option>)}</select></label>} /><div className="gp-diagnostic-grid gp-diagnostic-grid-large">{data.diagnostics.map((item) => <article className={`gp-diagnostic gp-diagnostic-${item.tone}`} key={item.title}><small>{item.title}</small><strong>{item.value}</strong><p>{item.description}</p><span>Indicador calculado sobre {year}</span></article>)}</div><div className="gp-grid gp-grid-2"><Card title="Ranking de participação das MPEs" description="Municípios com maior percentual de compras destinadas às MPEs."><BarRows rows={data.topMunicipalities.map((item) => ({ label: item.name, value: item.mpePercent, meta: `${pct(item.mpePercent)} · ${currency(item.mpeValue)}` }))} formatter={pct} /></Card><Card title="Naturezas que movimentam a economia" description="Categorias com maior valor comprado no conjunto dos municípios."><BarRows rows={data.natures.map((item) => ({ label: item.label, value: item.value, meta: `${pct(item.mpePercent)} para MPEs` }))} /></Card></div><p className="gp-source-note"><Info size={15} /> O diagnóstico apresenta padrões dos dados e não substitui análise técnica, jurídica ou orçamentária.</p></div>;
}

export function GestorPublicoRelatorios() {
  const [filters, setFilters] = useState(DEFAULT_GESTOR_FILTERS);
  const [type, setType] = useState("Relatório completo de compras públicas");
  const [format, setFormat] = useState("PDF");
  const [sections, setSections] = useState<ReportSections>(DEFAULT_REPORT_SECTIONS);
  const [generated, setGenerated] = useState(false);
  const [history, setHistory] = useState<Array<{ id: number; type: string; format: string; date: string }>>([]);
  const data = useMemo(() => getDashboardData(filters), [filters]);
  const toggleSection = (key: keyof ReportSections) => setSections((current) => ({ ...current, [key]: !current[key] }));
  const generate = () => {
    setGenerated(true);
    setHistory((current) => [{ id: Date.now(), type, format, date: new Date().toLocaleString("pt-BR") }, ...current]);
    if (format === "CSV") {
      const rows = [["Natureza", "Valor total", "Valor para MPEs", "% MPEs"], ...data.natures.map((item) => [item.label, currency(item.value), currency(item.mpeValue), pct(item.mpePercent)])];
      const url = URL.createObjectURL(new Blob([`\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\n")}`], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = `relatorio-compras-${filters.year}.csv`; link.click(); URL.revokeObjectURL(url); return;
    }
    window.setTimeout(() => window.print(), 80);
  };
  return <div className="gp-main"><PageHeader eyebrow="RELATÓRIOS" title="Monte o relatório que você precisa" description="Escolha o recorte, os conteúdos e os municípios. O documento só aparece quando você gerar a exportação." /><ReportFilters filters={filters} onChange={setFilters} /><Card title="Conteúdo do relatório" description="Selecione as informações que devem aparecer no PDF."><div className="gp-report-config"><div className="gp-report-selects"><PublicFilterSelect name="tipo-relatorio" label="Modelo" icon="nature" variant="analysis" value={type} options={["Relatório completo de compras públicas", "Participação das MPEs", "Comparativo de municípios", "Compras por natureza da despesa", "Fornecedores e classificação empresarial"].map((item) => ({ value: item, label: item }))} onValueChange={setType} /><PublicFilterSelect name="formato-relatorio" label="Exportar como" icon="year" variant="analysis" value={format} options={["PDF", "CSV"].map((item) => ({ value: item, label: item }))} onValueChange={setFormat} /></div><div className="gp-report-options" role="group" aria-label="Seções do relatório">{([ ["summary", "Resumo executivo"], ["methodology", "Metodologia e fonte"], ["natures", "Compras por natureza"], ["geography", "Municípios e origens"], ["suppliers", "Fornecedores detalhados"], ["charts", "Gráficos e indicadores"] ] as Array<[keyof ReportSections, string]>).map(([key, label]) => <label key={key}><input type="checkbox" checked={sections[key]} onChange={() => toggleSection(key)} /> <span>{label}</span></label>)}</div><button type="button" className="gp-primary-button gp-report-generate" onClick={generate}><Printer size={17} /> Gerar {format}</button></div><p className="gp-pending-note"><Info size={15} /> O PDF respeita exatamente as opções selecionadas. Para CSV, é exportado o resumo tabular do mesmo recorte.</p></Card>{generated && <ReportDocument data={data} filters={filters} type={type} sections={sections} />}<Card title="Histórico de relatórios" description="Exportações preparadas nesta sessão.">{history.length ? <div className="gp-table-wrap"><table className="gp-table"><thead><tr><TableHeader>Nome</TableHeader><TableHeader>Municípios</TableHeader><TableHeader>Período</TableHeader><TableHeader>Gerado em</TableHeader><TableHeader>Formato</TableHeader></tr></thead><tbody>{history.map((item) => <tr key={item.id}><td><strong>{item.type}</strong></td><td>{filters.municipalities.length || "Todos"}</td><td>{filters.year}</td><td>{item.date}</td><td>{item.format}</td></tr>)}</tbody></table></div> : <EmptyState>Nenhum relatório exportado nesta sessão.</EmptyState>}</Card></div>;
}

function ReportDocument({ data, filters, type, sections }: { data: ReturnType<typeof getDashboardData>; filters: GestorPublicFilters; type: string; sections: ReportSections }) {
  const municipality = filters.municipalities.length === 1 ? data.selected[0]?.name ?? "Município selecionado" : filters.municipalities.length > 1 ? `${filters.municipalities.length} municípios selecionados` : "Todos os municípios";
  const suppliers = data.suppliers.slice(0, 80);
  const municipalities = data.allMunicipalities.filter((item) => !filters.municipalities.length || filters.municipalities.includes(item.id)).sort((a, b) => b.mpeValue - a.mpeValue).slice(0, 80);
  const natureRows = data.natures.map((item) => { const me = item.mpeValue * .56; const epp = item.mpeValue - me; return { ...item, me, epp, demais: Math.max(0, item.value - item.mpeValue), mePercent: item.value ? me / item.value * 100 : 0 }; });
  return <article className="gp-report-document" aria-label="Prévia do relatório exportado">
    <header className="gp-report-cover"><span>COMPRAS ABERTAS · GESTOR PÚBLICO</span><h2>Relatório de Compras Públicas</h2><h3>{municipality.toUpperCase()} · {filters.year}</h3><p>Participação de micro e pequenas empresas nas compras públicas e distribuição dos fornecedores.</p><div className="gp-report-cover-meta"><span>Período consultado <b>{filters.year}</b></span><span>Natureza <b>{filters.nature ? natureName(filters.nature) : "Todas as naturezas"}</b></span><span>Fonte <b>Base pública demonstrativa</b></span></div></header>
    {sections.methodology && <section className="gp-report-section gp-report-page-break"><h3>APRESENTAÇÃO</h3><p>Este relatório apresenta um panorama das compras públicas realizadas no período selecionado, destacando a participação das microempresas e empresas de pequeno porte e a circulação dos recursos na economia local.</p><p>As informações foram organizadas para facilitar a leitura por gestores, empresas e cidadãos, preservando o recorte de município, ano e natureza escolhido no painel.</p><h3 className="gp-report-subheading">METODOLOGIA</h3><p>Os dados são agrupados por natureza da despesa, porte empresarial, município e origem do fornecedor. Os valores exibidos nesta versão são demonstrativos e devem ser conferidos na fonte oficial antes de decisões administrativas.</p><dl className="gp-report-meta"><div><dt>Municípios analisados</dt><dd>{number(data.totals.municipalities)}</dd></div><div><dt>Ano</dt><dd>{filters.year}</dd></div><div><dt>Natureza</dt><dd>{filters.nature ? natureName(filters.nature) : "Todas"}</dd></div><div><dt>Atualização</dt><dd>{new Date().toLocaleDateString("pt-BR")}</dd></div></dl></section>}
    {sections.summary && <section className="gp-report-section"><h3>RESUMO EXECUTIVO</h3><div className="gp-report-kpis"><div><small>Valor total homologado</small><b>{currency(data.totals.total)}</b></div><div><small>Valor para MPEs</small><b>{currency(data.totals.mpeValue)}</b><span>{pct(data.totals.mpePercent)} do total</span></div><div><small>Compras locais</small><b>{currency(data.totals.localValue)}</b></div><div><small>Participações identificadas</small><b>{number(data.totals.suppliers)}</b></div></div></section>}
    {sections.natures && <section className="gp-report-section gp-report-page-break"><h3>TABELA 01 · TOTAL DAS COMPRAS POR NATUREZA DA DESPESA</h3><div className="gp-report-table-wrap"><table className="gp-report-table gp-report-table-wide"><thead><tr><th>Natureza da despesa</th><th>Demais empresas</th><th>Microempresa</th><th>Empresa de pequeno porte</th><th>Valor total</th><th>% MPE</th><th>% ME</th></tr></thead><tbody>{natureRows.map((item) => <tr key={item.code}><td>{item.label}</td><td>{currency(item.demais)}</td><td>{currency(item.me)}</td><td>{currency(item.epp)}</td><td>{currency(item.value)}</td><td>{pct(item.mpePercent)}</td><td>{pct(item.mePercent)}</td></tr>)}</tbody><tfoot><tr><td>Total</td><td>{currency(natureRows.reduce((sum, item) => sum + item.demais, 0))}</td><td>{currency(natureRows.reduce((sum, item) => sum + item.me, 0))}</td><td>{currency(natureRows.reduce((sum, item) => sum + item.epp, 0))}</td><td>{currency(data.totals.total)}</td><td>{pct(data.totals.mpePercent)}</td><td>{pct(natureRows.reduce((sum, item) => sum + item.me, 0) / Math.max(1, data.totals.total) * 100)}</td></tr></tfoot></table></div><small className="gp-report-caption">Fonte: dados públicos municipais do recorte selecionado. Valores demonstrativos do protótipo.</small></section>}
    {sections.geography && <section className="gp-report-section gp-report-page-break"><h3>TABELA 02 · DISTRIBUIÇÃO GEOGRÁFICA DOS FORNECEDORES</h3><div className="gp-report-table-wrap"><table className="gp-report-table"><thead><tr><th>Origem</th><th>Demais empresas</th><th>MPEs</th><th>Valor total</th><th>% MPE</th></tr></thead><tbody>{data.origins.map((item) => <tr key={item.label}><td>{item.label}</td><td>{currency(item.value * (1 - data.totals.mpePercent / 100))}</td><td>{currency(item.value * data.totals.mpePercent / 100)}</td><td>{currency(item.value)}</td><td>{pct(data.totals.mpePercent)}</td></tr>)}</tbody><tfoot><tr><td>Total</td><td>{currency(data.totals.total - data.totals.mpeValue)}</td><td>{currency(data.totals.mpeValue)}</td><td>{currency(data.totals.total)}</td><td>{pct(data.totals.mpePercent)}</td></tr></tfoot></table></div><h3 className="gp-report-subheading">TABELA 03 · DISTRIBUIÇÃO POR MUNICÍPIO</h3><div className="gp-report-table-wrap"><table className="gp-report-table"><thead><tr><th>Município</th><th>Região</th><th>Valor total</th><th>Valor para MPEs</th><th>% MPE</th><th>% locais</th></tr></thead><tbody>{municipalities.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.region}</td><td>{currency(item.total)}</td><td>{currency(item.mpeValue)}</td><td>{pct(item.mpePercent)}</td><td>{pct(item.localPercent)}</td></tr>)}</tbody></table></div></section>}
    {sections.suppliers && <section className="gp-report-section gp-report-page-break"><h3>FORNECEDORES E CLASSIFICAÇÃO EMPRESARIAL</h3><div className="gp-report-table-wrap"><table className="gp-report-table"><thead><tr><th>Fornecedor</th><th>CNPJ</th><th>Município/UF</th><th>Porte</th><th>Natureza</th><th>Valor</th></tr></thead><tbody>{suppliers.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.cnpj}</td><td>{item.municipality}/{item.state}</td><td>{item.size}</td><td>{natureName(item.nature)}</td><td>{currency(item.total)}</td></tr>)}</tbody></table></div></section>}
    {sections.charts && <section className="gp-report-section"><h3>GRÁFICOS E INDICADORES</h3><div className="gp-report-chart">{data.natures.map((item) => <div key={item.code}><span title={item.label}>{item.label}</span><div><i style={{ width: `${Math.max(2, item.value / Math.max(1, ...data.natures.map((row) => row.value)) * 100)}%` }} /></div><b>{currency(item.value)}</b></div>)}</div></section>}
    <footer className="gp-report-footer">Fonte: Compras Abertas · Período consultado: {filters.year} · Relatório gerado em {new Date().toLocaleDateString("pt-BR")}.<br />Este documento é demonstrativo e não substitui os registros oficiais.</footer>
  </article>;
}

function FileBarChartIcon() { return <FileBarChart size={17} />; }
