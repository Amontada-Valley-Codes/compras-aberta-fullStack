"use client";

import { PublicTable, PublicTablePagination, PublicSortHeader } from "@/components/filters/PublicTable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, CircleDollarSign, Info, MapPinned, Printer, RefreshCw, Search, Store, TrendingUp } from "lucide-react";
import { formatDateBr } from "@/features/dashboard/gestor/gestor-domain";
import { compactMoney } from "@/features/public-data/format";
import { PublicFilterSelect } from "@/components/filters/PublicFilterSelect";
import { LocalPaymentShareChart, PaymentNatureChart, PaymentShareChart } from "@/features/analysis/PaymentCharts";
import {
  GESTOR_PUBLICO_YEARS, getDashboardData, getNatureOptions, getSupplierSummaries, natureName, type GestorPublicFilters, type MunicipalitySummary, type SupplierSummary,
} from "./gestor-publico-data";
import { useMunicipalitySummaries } from "./use-gestor-public-data";
import { AnalysisCard, Card, EmptyState, PageHeader, PublicKpi } from "./GestorPublicoUI";

const currency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const pct = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export const DEFAULT_GESTOR_FILTERS: GestorPublicFilters = { municipalities: [], year: GESTOR_PUBLICO_YEARS[0], nature: "" };

export { PageHeader, Card };

function csvCell(value: string | number): string {
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

function PublicDashboardFilters({ filters, onChange }: { filters: GestorPublicFilters; onChange: (next: GestorPublicFilters) => void }) {
  const { data: summaries } = useMunicipalitySummaries(filters.year);
  const municipalities = summaries.map((item) => ({ value: item.id, label: item.name }));
  return <section className="analysis-filters gp-analysis-filters" aria-label="Filtros da análise">
    <div className="analysis-filter-fields">
      <PublicFilterSelect name="municipio" label="Município" allLabel="Todos os municípios" icon="municipality" variant="analysis" value={filters.municipalities[0] ?? ""} options={municipalities} onValueChange={(value) => onChange({ ...filters, municipalities: value ? [value] : [] })} />
      <PublicFilterSelect name="ano" label="Ano" icon="year" variant="analysis" value={String(filters.year)} options={GESTOR_PUBLICO_YEARS.map((year) => ({ value: String(year), label: String(year) }))} onValueChange={(value) => onChange({ ...filters, year: Number(value) || GESTOR_PUBLICO_YEARS[0], nature: "" })} />
      <PublicFilterSelect name="natureza" label="Natureza da despesa" allLabel="Todas as naturezas" icon="nature" variant="analysis" value={filters.nature} options={getNatureOptions(summaries).map((item) => ({ value: item.code, label: item.label }))} onValueChange={(value) => onChange({ ...filters, nature: value as GestorPublicFilters["nature"] })} />
    </div>
  </section>;
}

function DashboardLoadingSkeleton() {
  const block = (className: string) => <span className={`analysis-skeleton-block ${className}`} aria-hidden="true" />;
  return <div role="status" aria-label="Carregando dados de pagamentos dos municípios" aria-busy="true">
    <span className="gp-sr-only">Carregando dados de pagamentos dos municípios</span>
    <section className="analysis-skeleton-kpis">{[1, 2, 3].map((item) => <article key={item}><div>{block("analysis-skeleton-icon")}{block("analysis-skeleton-label")}</div>{block("analysis-skeleton-value")}{block("analysis-skeleton-detail")}</article>)}</section>
    <section className="analysis-skeleton-chart-grid">{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => <article key={item} className={`analysis-skeleton-chart-card ${item === 2 ? "analysis-skeleton-chart-card--share" : ""}`}>
      {block("analysis-skeleton-chart-title")}{block("analysis-skeleton-chart-description")}
      {item === 2 ? <div className="analysis-skeleton-share">{[1, 2].map((share) => <div key={share}>{block("analysis-skeleton-share-label")}<div className="analysis-skeleton-controls">{block("")}{block("")}</div>{block(`analysis-skeleton-donut${share === 2 ? " analysis-skeleton-donut--second" : ""}`)}{block("analysis-skeleton-share-value")}</div>)}</div> : <><div className="analysis-skeleton-controls">{block("")}{block("")}</div><div className="analysis-skeleton-chart"><div className="analysis-skeleton-y-labels">{[1, 2, 3, 4, 5].map((bar) => <span key={bar} className="analysis-skeleton-block" aria-hidden="true" />)}</div><div className="analysis-skeleton-bars">{[1, 2, 3, 4, 5].map((bar) => <span key={bar} className={`analysis-skeleton-block analysis-skeleton-bar analysis-skeleton-bar--${bar}`} aria-hidden="true" />)}</div></div></>}
    </article>)}</section>
  </div>;
}

function PublicDashboardChartGrid({ data }: { data: ReturnType<typeof getDashboardData> }) {
  const chartRows = data.natures.map((row) => {
    const localValue = data.selected.reduce((sum, municipality) => sum + (municipality.localNatures[row.code] ?? 0), 0);
    return {
      codigo_natureza: row.code,
      nome_natureza: row.label,
      total_controle: String(row.value),
      valor_me: String(row.mpeValue),
      valor_local: localValue,
      valor_demais: Math.max(0, row.value - row.mpeValue),
      percentual_me: row.mpePercent,
      percentual_local_me: row.mpeValue > 0 ? localValue / row.mpeValue * 100 : 0,
    };
  });
  const localPercentage = data.totals.localValue / Math.max(1, data.totals.total) * 100;
  const chartHeight = Math.max(240, 70 + chartRows.length * 34);
  if (data.natures.length === 1) {
    const nature = data.natures[0];
    if (nature.value <= 0) return <EmptyState>Não há pagamentos registrados para {nature.label.toLocaleLowerCase("pt-BR")} neste recorte.</EmptyState>;
    const otherPayments = Math.max(0, nature.value - nature.mpeValue);
    return <div className="analysis-chart-grid gp-analysis-chart-grid gp-nature-filtered-grid">
      <AnalysisCard title={`Como se dividiram os pagamentos em ${nature.label}?`} description="Veja quanto foi destinado a ME locais, outras ME e demais fornecedores.">
        <div className="gp-nature-breakdown">
          <div className="gp-nature-total"><small>Quanto foi pago no total?</small><strong>{currency(nature.value)}</strong></div>
          <div className="gp-nature-breakdown-row"><div><span>Quanto foi pago a ME?</span><strong>{currency(nature.mpeValue)}</strong></div><small>{pct(nature.mpePercent)} do total</small><div className="gp-nature-track"><i className="is-me" style={{ width: `${Math.min(100, nature.mpePercent)}%` }} /></div></div>
          <div className="gp-nature-breakdown-row"><div><span>Quanto foi pago aos demais fornecedores?</span><strong>{currency(otherPayments)}</strong></div><small>{pct(Math.max(0, 100 - nature.mpePercent))} do total</small><div className="gp-nature-track"><i className="is-other" style={{ width: `${Math.max(0, 100 - nature.mpePercent)}%` }} /></div></div>
          <div className="gp-nature-local"><span>Quanto foi pago a ME locais identificadas?</span><strong>{currency(data.totals.localValue)}</strong><small>{pct(localPercentage)} do total da natureza</small></div>
        </div>
      </AnalysisCard>
      <AnalysisCard title="Quanto das compras foi para ME?" description="Compare o total pago a ME com a parcela identificada como local.">
        <div className="analysis-share-comparison gp-nature-filtered-shares"><div className="analysis-share-item"><h3>Quanto foi pago a ME em geral?</h3><PaymentShareChart percentage={data.totals.mpePercent} size={180} /><p>{currency(data.totals.mpeValue)} pagos a ME</p></div><div className="analysis-share-item"><h3>Quanto foi pago a ME locais?</h3><LocalPaymentShareChart percentage={localPercentage} size={180} /><p>{currency(data.totals.localValue)} pagos a ME locais</p></div></div>
      </AnalysisCard>
    </div>;
  }
  return <div className="analysis-chart-grid gp-analysis-chart-grid">
    <AnalysisCard title="Quanto foi pago a ME em cada natureza?" description="Compare os valores destinados a micro e pequenas empresas por categoria."><PaymentNatureChart data={chartRows} metric="valor_me" height={chartHeight} /></AnalysisCard>
    <AnalysisCard title="Qual parte dos pagamentos foi para ME locais?" description="Compare a parcela local identificada com o total pago a ME."><div className="analysis-share-comparison"><div className="analysis-share-item"><h3>Quanto foi pago a ME locais?</h3><LocalPaymentShareChart percentage={localPercentage} size={180} /><p>{currency(data.totals.localValue)} pagos a ME locais</p></div><div className="analysis-share-item"><h3>Quanto foi pago a ME em geral?</h3><PaymentShareChart percentage={data.totals.mpePercent} size={180} /><p>{currency(data.totals.mpeValue)} pagos a ME</p></div></div></AnalysisCard>
    <AnalysisCard title="Quanto foi pago no total em cada natureza?" description="Veja o valor pago a fornecedores de todos os portes em cada categoria."><PaymentNatureChart data={chartRows} metric="total_controle" height={chartHeight} /></AnalysisCard>
    <AnalysisCard title="Quanto foi pago aos demais fornecedores em cada natureza?" description="Diferença entre o total pago e o valor destinado a ME, no mesmo recorte e período."><PaymentNatureChart data={chartRows} metric="valor_demais" height={chartHeight} /></AnalysisCard>
    <AnalysisCard title="Quanto foi pago a ME locais em cada natureza?" description="Valores reconhecidos pela API como pagamentos a fornecedores locais."><PaymentNatureChart data={chartRows} metric="valor_local" height={chartHeight} /></AnalysisCard>
    <AnalysisCard title="Qual parte de cada natureza foi paga a ME?" description="Compare a participação das micro e pequenas empresas em cada categoria."><PaymentNatureChart data={chartRows} metric="percentual_me" height={chartHeight} /></AnalysisCard>
    <AnalysisCard title="Qual parte dos pagamentos a ME foi identificada como local?" description="Proporção do valor pago a ME que a API reconhece como local em cada categoria."><PaymentNatureChart data={chartRows} metric="percentual_local_me" height={chartHeight} /></AnalysisCard>
    <AnalysisCard title="Resumo do recorte" description="Valores consolidados para os municípios, o ano e as naturezas selecionados.">
      <dl className="gp-overview-summary">
        <div><dt>Total pago a todos os fornecedores</dt><dd>{currency(data.totals.total)}</dd></div>
        <div><dt>Participação das ME no total pago</dt><dd>{pct(data.totals.mpePercent)}</dd></div>
        <div><dt>Parcela do total paga a ME locais</dt><dd>{pct(localPercentage)}</dd></div>
        <div><dt>Municípios com dados no recorte</dt><dd>{number(data.totals.municipalities)}</dd></div>
      </dl>
    </AnalysisCard>
  </div>;
}

function MunicipalityRanking({ municipalities, byValue = false, year }: { municipalities: MunicipalitySummary[]; byValue?: boolean; year: number }) {
  return <ol className="gp-overview-ranking">
    {municipalities.map((item, index) => (
      <li key={item.id}>
        <Link href={`/gestor/municipios/${item.id}?ano=${year}`}>
          <span className="gp-overview-rank">{String(index + 1).padStart(2, "0")}</span>
          <span className="gp-overview-municipality">
            <span>{item.name}</span>
            <small title={byValue ? undefined : `${currency(item.mpeValue)} pagos a ME`}>{byValue ? `${pct(item.mpePercent)} dos pagamentos` : `${compactMoney(item.mpeValue)} pagos a ME`}</small>
          </span>
          <strong title={byValue ? currency(item.mpeValue) : undefined} aria-label={byValue ? currency(item.mpeValue) : undefined}>{byValue ? compactMoney(item.mpeValue) : pct(item.mpePercent)}</strong>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </li>
    ))}
  </ol>;
}

export function GestorPublicoDashboard() {
  const [filters, setFilters] = useState(DEFAULT_GESTOR_FILTERS);
  const { data: summaries, loading, error } = useMunicipalitySummaries(filters.year);
  const data = useMemo(() => getDashboardData(filters, summaries), [filters, summaries]);
  const selectedName = filters.municipalities.length === 1 ? `em ${data.selected[0]?.name ?? "município selecionado"}` : "no Ceará";
  return <div className="gp-main gp-analysis-main gp-overview">
    <section className="analysis-title-row gp-analysis-title-row"><div><h1>Como foram distribuídos os pagamentos {selectedName}?</h1><p>Veja quanto foi pago em cada natureza da despesa e qual parcela chegou às micro e pequenas empresas.</p></div></section>
    <PublicDashboardFilters filters={filters} onChange={setFilters} />
    <div className="gp-filter-summary"><span>{data.totals.municipalities} municípios analisados</span><span>Ano {filters.year}</span>{filters.nature && <span>{natureName(filters.nature)}</span>}</div>
    {loading ? <DashboardLoadingSkeleton /> : <>
    <section className="analysis-kpis" aria-label="Indicadores principais">
      <PublicKpi icon={<CircleDollarSign />} label="Quanto foi pago a ME?" amount={data.totals.mpeValue} detail="Pagamentos registrados para microempresas." />
      <PublicKpi icon={<Store />} label="Quantas ME locais foram identificadas?" value={number(data.totals.suppliers)} detail="Empresas locais identificadas na coleta de pagamentos." accent />
      <PublicKpi icon={<MapPinned />} label="Quanto foi pago a ME locais?" amount={data.totals.localValue} detail="Valor destinado a empresas sediadas no próprio município." />
    </section>
    {error ? <EmptyState>{error}</EmptyState> : summaries.length ? <PublicDashboardChartGrid data={data} /> : <EmptyState>A API não retornou pagamentos para este exercício.</EmptyState>}
    </>}
    {!loading && !error && summaries.length > 0 && (
      <div className="gp-grid gp-grid-2 gp-secondary-dashboard-grid">
        <Card title="Quais municípios têm maior participação de ME?" description="Municípios onde as ME receberam a maior parcela dos pagamentos.">
          <MunicipalityRanking municipalities={data.topMunicipalities} year={filters.year} />
        </Card>
        <Card title="Onde foi pago o maior valor a ME?" description="Municípios que mais destinaram recursos a micro e pequenas empresas.">
          <MunicipalityRanking municipalities={[...data.allMunicipalities].sort((a, b) => b.mpeValue - a.mpeValue).slice(0, 5)} byValue year={filters.year} />
        </Card>
      </div>
    )}
  </div>;
}

export function GestorPublicoNaturezas() {
  const [filters, setFilters] = useState<GestorPublicFilters>(DEFAULT_GESTOR_FILTERS);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"value" | "mpePercent" | "localValue">("value");
  const [ascending, setAscending] = useState(false);
  const year = filters.year;
  const { data: summaries, loading, error } = useMunicipalitySummaries(year);
  const data = useMemo(() => getDashboardData(filters, summaries), [filters, summaries]);
  const allData = useMemo(() => getDashboardData({ ...filters, nature: "" }, summaries), [filters, summaries]);
  const allRows = useMemo(() => allData.natures.map((row) => ({
    ...row,
    localValue: allData.selected.reduce((sum, municipality) => sum + (municipality.localNatures[row.code] ?? 0), 0),
    localSuppliers: allData.selected.reduce((sum, municipality) => sum + (municipality.localSuppliersByNature[row.code] ?? 0), 0),
  })), [allData]);
  const chartRows = data.natures.map((row) => {
    const localValue = data.selected.reduce((sum, municipality) => sum + (municipality.localNatures[row.code] ?? 0), 0);
    return {
      codigo_natureza: row.code,
      nome_natureza: row.label,
      total_controle: String(row.value),
      valor_me: String(row.mpeValue),
      valor_local: localValue,
      valor_demais: Math.max(0, row.value - row.mpeValue),
      percentual_me: row.mpePercent,
      percentual_local_me: row.mpeValue > 0 ? localValue / row.mpeValue * 100 : 0,
    };
  });
  const normalizedQuery = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
  const rows = useMemo(() => allRows
    .filter((row) => row.label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").includes(normalizedQuery))
    .filter((row) => !filters.nature || row.code === filters.nature)
    .sort((a, b) => {
      const difference = a[sort] - b[sort];
      return ascending ? difference : -difference;
    }), [allRows, ascending, filters.nature, normalizedQuery, sort]);
  const visibleTotals = rows.reduce((total, row) => ({
    value: total.value + row.value,
    mpeValue: total.mpeValue + row.mpeValue,
    localValue: total.localValue + row.localValue,
    localSuppliers: total.localSuppliers + row.localSuppliers,
  }), { value: 0, mpeValue: 0, localValue: 0, localSuppliers: 0 });
  const setFocusNature = (nature: string) => setFilters((current) => ({ ...current, nature }));
  const sortBy = (key: typeof sort) => {
    setAscending((current) => key === sort ? !current : false);
    setSort(key);
  };
  const leadingTotal = [...allRows].filter((row) => row.value > 0).sort((a, b) => b.value - a.value)[0];
  const leadingMe = [...allRows].filter((row) => row.value > 0).sort((a, b) => b.mpePercent - a.mpePercent)[0];
  const leadingLocal = [...allRows].filter((row) => row.localValue > 0).sort((a, b) => b.localValue - a.localValue)[0];
  const topThreeNatureValue = [...allRows].sort((a, b) => b.value - a.value).slice(0, 3).reduce((sum, row) => sum + row.value, 0);
  const localNatureCount = allRows.filter((row) => row.localValue > 0).length;
  const localPercentage = data.totals.localValue / Math.max(1, data.totals.total) * 100;
  const chartHeight = Math.max(240, 70 + chartRows.length * 34);
  return <div className="gp-main gp-natures-page">
    <PageHeader title="Quais naturezas concentram os pagamentos?" description="Identifique onde estão os maiores gastos, quanto foi para ME e qual parte foi paga a fornecedores locais." actions={<button type="button" className="gp-text-button" onClick={() => { setFilters(DEFAULT_GESTOR_FILTERS); setQuery(""); setSort("value"); setAscending(false); }}><RefreshCw size={15} /> Limpar filtros</button>} />
    <section className="analysis-filters gp-analysis-filters gp-nature-filters" aria-label="Filtros de natureza da despesa"><div className="analysis-filter-fields">
      <PublicFilterSelect name="natureza-ano" label="Ano do pagamento" icon="year" variant="analysis" value={String(year)} options={GESTOR_PUBLICO_YEARS.map((item) => ({ value: String(item), label: String(item) }))} onValueChange={(value) => setFilters((current) => ({ ...current, year: Number(value) || GESTOR_PUBLICO_YEARS[0], nature: "" }))} />
      <PublicFilterSelect name="natureza-municipio" label="Município" allLabel="Todos os municípios" icon="municipality" variant="analysis" value={filters.municipalities[0] ?? ""} options={summaries.map((item) => ({ value: item.id, label: item.name }))} onValueChange={(value) => setFilters((current) => ({ ...current, municipalities: value ? [value] : [] }))} />
      <PublicFilterSelect name="natureza-foco" label="Focar em uma natureza" allLabel="Todas as naturezas" icon="nature" variant="analysis" value={filters.nature} options={getNatureOptions(summaries).map((item) => ({ value: item.code, label: item.label }))} onValueChange={(value) => setFocusNature(value)} />
    </div></section>
    <div className="gp-filter-summary"><span>{data.totals.municipalities} municípios no recorte</span><span>Ano {year}</span>{filters.nature && <span>{natureName(filters.nature)}</span>}</div>
    {loading ? <DashboardLoadingSkeleton /> : error ? <EmptyState>{error}</EmptyState> : summaries.length ? <>
      <section className="analysis-kpis gp-nature-kpis" aria-label="Resumo dos pagamentos"><PublicKpi icon={<CircleDollarSign />} label="Quanto foi pago no recorte?" amount={data.totals.total} detail={`${number(data.natures.length)} naturezas consideradas`} /><PublicKpi icon={<Store />} label="Quanto foi pago a ME?" amount={data.totals.mpeValue} detail={`${pct(data.totals.mpePercent)} do total pago`} accent /><PublicKpi icon={<MapPinned />} label="Quanto foi pago a ME locais?" amount={data.totals.localValue} detail={`${pct(localPercentage)} do total no recorte`} /><PublicKpi icon={<TrendingUp />} label="Quantas naturezas tiveram pagamentos?" value={number(data.natures.filter((row) => row.value > 0).length)} detail="Categorias disponíveis nos filtros atuais." /><PublicKpi icon={<CircleDollarSign />} label="Quanto concentram as três maiores naturezas?" value={pct(topThreeNatureValue / Math.max(1, allData.totals.total) * 100)} detail={`${currency(topThreeNatureValue)} somados no período.`} /><PublicKpi icon={<MapPinned />} label="Em quantas naturezas houve pagamento a ME locais?" value={number(localNatureCount)} detail="Categorias com valores locais identificados pela API." /></section>
      <Card title="Qual natureza merece atenção primeiro?" description="Acesse diretamente a categoria com maior gasto, maior participação de ME ou maior valor local.">
        <div className="gp-nature-insights">{[
          { label: "Qual natureza teve o maior valor pago?", row: leadingTotal, value: leadingTotal ? currency(leadingTotal.value) : "Sem dados", detail: leadingTotal?.label ?? "Sem pagamentos no período." },
          { label: "Em qual natureza as ME tiveram maior participação?", row: leadingMe, value: leadingMe ? pct(leadingMe.mpePercent) : "Sem dados", detail: leadingMe?.label ?? "Sem categorias com pagamentos." },
          { label: "Onde foi pago mais às ME locais?", row: leadingLocal, value: leadingLocal ? currency(leadingLocal.localValue) : "Sem dados", detail: leadingLocal?.label ?? "Sem pagamentos locais identificados." },
        ].map((item) => <button type="button" className="gp-nature-insight" key={item.label} disabled={!item.row} onClick={() => item.row && setFocusNature(item.row.code)}><span>{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small><em>{item.row ? "Ver categoria" : "Indisponível"} <ArrowRight size={14} /></em></button>)}</div>
      </Card>
      {filters.nature ? <PublicDashboardChartGrid data={data} /> : <div className="analysis-chart-grid gp-nature-chart-grid">
        <AnalysisCard title="Quanto foi pago em cada natureza?" description="Categorias ordenadas pelo valor efetivamente pago."><PaymentNatureChart data={chartRows} metric="total_controle" height={chartHeight} /></AnalysisCard>
        <AnalysisCard title="Quanto foi pago a ME em cada natureza?" description="Veja quais categorias concentram pagamentos a micro e pequenas empresas."><PaymentNatureChart data={chartRows} metric="valor_me" height={chartHeight} /></AnalysisCard>
        <AnalysisCard title="Quanto foi pago a ME locais em cada natureza?" description="Valores reconhecidos pela API como pagamentos a fornecedores locais."><PaymentNatureChart data={chartRows} metric="valor_local" height={chartHeight} /></AnalysisCard>
        <AnalysisCard title="Qual parte de cada natureza foi paga a ME?" description="Compare a participação das micro e pequenas empresas em cada categoria."><PaymentNatureChart data={chartRows} metric="percentual_me" height={chartHeight} /></AnalysisCard>
        <AnalysisCard title="Qual parte do total foi paga a ME?" description="Compare a participação das ME em geral com a parcela local identificada."><div className="analysis-share-comparison"><div className="analysis-share-item"><h3>Qual parte foi paga a ME em geral?</h3><PaymentShareChart percentage={data.totals.mpePercent} size={180} /><p>{currency(data.totals.mpeValue)} pagos a ME</p></div><div className="analysis-share-item"><h3>Qual parte foi paga a ME locais?</h3><LocalPaymentShareChart percentage={localPercentage} size={180} /><p>{currency(data.totals.localValue)} pagos a ME locais</p></div></div></AnalysisCard>
      </div>}
      <Card className="gp-nature-values-card" title="Quais foram os valores pagos em cada natureza?" description="Pesquise e ordene os valores para encontrar rapidamente as categorias prioritárias." actions={<label className="gp-nature-search"><Search size={16} /><input type="search" aria-label="Buscar natureza da despesa" placeholder="Buscar natureza" value={query} onChange={(event) => setQuery(event.target.value)} /></label>}>
        <div className="gp-nature-mobile-sort"><label>Ordenar por <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="value">Total pago</option><option value="mpePercent">Participação de ME</option><option value="localValue">Pago a ME locais</option></select></label><button type="button" onClick={() => setAscending((current) => !current)} aria-label={ascending ? "Ordenar do maior para o menor" : "Ordenar do menor para o maior"} title={ascending ? "Ordem crescente" : "Ordem decrescente"}>{ascending ? <ArrowUp size={16} /> : <ArrowDown size={16} />}</button></div>
        <div className="gp-table-wrap"><table className="gp-table gp-nature-table" role="table" aria-label="Valores pagos por natureza da despesa">
          <thead role="rowgroup"><tr role="row"><th>Natureza da despesa</th><PublicSortHeader active={sort === "value"} ascending={ascending} onClick={() => sortBy("value")}>Total pago</PublicSortHeader><th>Pago a ME</th><PublicSortHeader active={sort === "mpePercent"} ascending={ascending} onClick={() => sortBy("mpePercent")}>% ME</PublicSortHeader><PublicSortHeader active={sort === "localValue"} ascending={ascending} onClick={() => sortBy("localValue")}>Pago a ME locais</PublicSortHeader><th>Fornecedores locais</th><th>Participação no total</th></tr></thead>
          <tbody role="rowgroup">{rows.map((row) => <tr key={row.code} role="row">
            <th scope="row" role="rowheader"><button type="button" className="gp-nature-row-focus" onClick={() => setFocusNature(row.code)}>{row.label}</button></th>
            <td role="cell" data-label="Total pago">{currency(row.value)}</td>
            <td role="cell" data-label="Pago a ME">{currency(row.mpeValue)}</td>
            <td role="cell" data-label="% ME">{pct(row.mpePercent)}</td>
            <td role="cell" data-label="Pago a ME locais">{currency(row.localValue)}</td>
            <td role="cell" data-label="Fornecedores locais">{number(row.localSuppliers)}</td>
            <td role="cell" data-label="Participação no total"><div className="gp-nature-share-cell"><span>{pct(row.value / Math.max(1, allData.totals.total) * 100)}</span><i><b style={{ width: `${Math.min(100, row.value / Math.max(1, allData.totals.total) * 100)}%` }} /></i></div></td>
          </tr>)}</tbody>
          <tfoot role="rowgroup"><tr role="row"><th scope="row" role="rowheader">Total das categorias exibidas</th>
            <td role="cell" data-label="Total pago">{currency(visibleTotals.value)}</td>
            <td role="cell" data-label="Pago a ME">{currency(visibleTotals.mpeValue)}</td>
            <td role="cell" data-label="% ME">{pct(visibleTotals.mpeValue / Math.max(1, visibleTotals.value) * 100)}</td>
            <td role="cell" data-label="Pago a ME locais">{currency(visibleTotals.localValue)}</td>
            <td role="cell" data-label="Fornecedores locais">{number(visibleTotals.localSuppliers)}</td>
            <td role="cell" data-label="Participação no total">{pct(visibleTotals.value / Math.max(1, allData.totals.total) * 100)}</td>
          </tr></tfoot>
        </table>{!rows.length && <EmptyState>Nenhuma natureza corresponde à busca.</EmptyState>}</div>
      </Card>
      <p className="gp-source-note"><Info size={15} /> Fonte: resumo de pagamentos e participação de ME locais da API, consultados pelo backend. O recorte local considera somente fornecedores identificados pela API.</p>
    </> : <EmptyState>A API não retornou pagamentos para este exercício.</EmptyState>}
  </div>;
}

function TableHeader({ children }: { children?: React.ReactNode }) { return <th>{children}</th>; }


export function GestorPublicoMunicipios() {
  const router = useRouter();
  const [pageSize, setPageSize] = useState(10);

  const [year, setYear] = useState<number>(GESTOR_PUBLICO_YEARS[0]);
  const [query, setQuery] = useState("");
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

  const { data: summaries, loading, error } = useMunicipalitySummaries(year);
  const data = useMemo(() => {
    return summaries
      .filter((item) => {
        const matchesName = normalizeText(item.name).includes(
          normalizedQuery
        );
        return matchesName;
      })
      .sort((a, b) => { const left = a[sort]; const right = b[sort]; const order = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), "pt-BR"); return ascending ? order : -order; });
  }, [normalizedQuery, sort, ascending, summaries]);

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
    router.push(`/gestor/municipios/${id}?ano=${year}`);
  };

  return (
    <div className="gp-main gp-municipalities-page">
      <PageHeader
        title="Pagamentos por município"
        description="Consulte pagamentos, participação de ME e valores locais em cada município."

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

        <PublicFilterSelect name="municipios-ano" label="Ano" icon="year" variant="analysis" value={String(year)} options={GESTOR_PUBLICO_YEARS.map((value) => ({ value: String(value), label: String(value) }))} onValueChange={(value) => { setYear(Number(value)); setPage(1); }} />
        <PublicFilterSelect name="municipios-ordem" label="Ordenar por" icon="nature" variant="analysis" value={sort} options={[{ value: "mpePercent", label: "Participação de ME" }, { value: "localPercent", label: "Compras locais" }, { value: "total", label: "Valor total" }]} onValueChange={(value) => { setSort(value as typeof sort); setAscending(false); setPage(1); }} />
      </div></div>

      <Card
        className="gp-list-card"
        title={loading ? "Carregando municípios..." : `${data.length} municípios encontrados`}
        description="Clique em um município para consultar seus indicadores e fornecedores."
      >
        {loading ? <EmptyState>Carregando dados dos municípios...</EmptyState> : error ? <EmptyState>{error}</EmptyState> : null}
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
                      href={`/gestor/municipios/${item.id}?ano=${year}`}
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
                  <td>{item.updatedAt ? formatDateBr(item.updatedAt) : "—"}</td>

                  <td>
                    <Link
                      className="gp-municipality-details-link"
                      href={`/gestor/municipios/${item.id}?ano=${year}`}
                      aria-label={`Ver detalhes de ${item.name}`}
                    >
                      <ArrowRight size={17} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </PublicTable>

          {!loading && !error && !data.length && (
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

export { MunicipalityDetailView as GestorPublicoMunicipioDetail } from "./MunicipalityDetailView";

type ReportSections = {
  summary: boolean;
  methodology: boolean;
  natures: boolean;
  geography: boolean;
  suppliers: boolean;
  charts: boolean;
};

const DEFAULT_REPORT_SECTIONS: ReportSections = {
  summary: true,
  methodology: true,
  natures: true,
  geography: true,
  suppliers: true,
  charts: true,
};

export function GestorPublicoRelatorios() {
  const [filters, setFilters] = useState(DEFAULT_GESTOR_FILTERS);
  const [type, setType] = useState("Relatório completo de compras públicas");
  const [format, setFormat] = useState("PDF");
  const [sections, setSections] = useState<ReportSections>(DEFAULT_REPORT_SECTIONS);
  const [generated, setGenerated] = useState(false);
  const [history, setHistory] = useState<Array<{ id: number; type: string; format: string; date: string }>>([]);
  const [supplierRows, setSupplierRows] = useState<SupplierSummary[]>([]);
  const [supplierRowsLoading, setSupplierRowsLoading] = useState(false);
  const { data: summaries, loading, error } = useMunicipalitySummaries(filters.year);
  const data = useMemo(() => getDashboardData(filters, summaries, supplierRows), [filters, summaries, supplierRows]);
  useEffect(() => {
    if (!generated || !sections.suppliers || !summaries.length) return;
    let active = true;
    const selectedMunicipalities = filters.municipalities.length ? summaries.filter((item) => filters.municipalities.includes(item.id)) : summaries;
    setSupplierRowsLoading(true);
    getSupplierSummaries(selectedMunicipalities, filters.year).then((rows) => { if (active) setSupplierRows(rows); }).catch(() => { if (active) setSupplierRows([]); }).finally(() => { if (active) setSupplierRowsLoading(false); });
    return () => { active = false; };
  }, [generated, sections.suppliers, summaries, filters.year, filters.municipalities]);
  const toggleSection = (key: keyof ReportSections) => setSections((current) => ({ ...current, [key]: !current[key] }));
  const generate = () => {
    setGenerated(true);
    setHistory((current) => [{ id: Date.now(), type, format, date: new Date().toLocaleString("pt-BR") }, ...current]);
    if (format === "CSV") {
      const rows = [["Natureza", "Valor total", "Valor para ME", "% ME"], ...data.natures.map((item) => [item.label, currency(item.value), currency(item.mpeValue), pct(item.mpePercent)])];
      const url = URL.createObjectURL(new Blob([`\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\n")}`], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = `relatorio-compras-${filters.year}.csv`; link.click(); URL.revokeObjectURL(url); return;
    }
    window.setTimeout(() => window.print(), 80);
  };
  return <div className="gp-main"><PageHeader eyebrow="RELATÓRIOS" title="Monte o relatório que você precisa" description="Escolha o recorte, os conteúdos e os municípios. O documento só aparece quando você gerar a exportação." />{error ? <EmptyState>{error}</EmptyState> : loading ? <EmptyState>Carregando dados pela API...</EmptyState> : <><PublicDashboardFilters filters={filters} onChange={setFilters} /><Card title="Conteúdo do relatório" description="Selecione as informações que devem aparecer no PDF."><div className="gp-report-config"><div className="gp-report-selects"><PublicFilterSelect name="tipo-relatorio" label="Modelo" icon="nature" variant="analysis" value={type} options={["Relatório completo de compras públicas", "Participação das ME", "Comparativo de municípios", "Compras por natureza da despesa", "Fornecedores e classificação empresarial"].map((item) => ({ value: item, label: item }))} onValueChange={setType} /><PublicFilterSelect name="formato-relatorio" label="Exportar como" icon="year" variant="analysis" value={format} options={["PDF", "CSV"].map((item) => ({ value: item, label: item }))} onValueChange={setFormat} /></div><div className="gp-report-options" role="group" aria-label="Seções do relatório">{([ ["summary", "Resumo executivo"], ["methodology", "Metodologia e fonte"], ["natures", "Compras por natureza"], ["geography", "Municípios e origens"], ["suppliers", "Fornecedores detalhados"], ["charts", "Gráficos e indicadores"] ] as Array<[keyof ReportSections, string]>).map(([key, label]) => <label key={key}><input type="checkbox" checked={sections[key]} onChange={() => toggleSection(key)} /> <span>{label}</span></label>)}</div><button type="button" className="gp-primary-button gp-report-generate" onClick={generate}><Printer size={17} /> Gerar {format}</button></div><p className="gp-pending-note"><Info size={15} /> O PDF usa os dados carregados das rotas de pagamentos do backend.</p></Card>{generated && (supplierRowsLoading ? <EmptyState>Carregando fornecedores para o relatório...</EmptyState> : <ReportDocument data={data} filters={filters} type={type} sections={sections} />)}</>}<Card title="Histórico de relatórios" description="Exportações preparadas nesta sessão.">{history.length ? <div className="gp-table-wrap"><table className="gp-table"><thead><tr><TableHeader>Nome</TableHeader><TableHeader>Municípios</TableHeader><TableHeader>Período</TableHeader><TableHeader>Gerado em</TableHeader><TableHeader>Formato</TableHeader></tr></thead><tbody>{history.map((item) => <tr key={item.id}><td><strong>{item.type}</strong></td><td>{filters.municipalities.length || "Todos"}</td><td>{filters.year}</td><td>{item.date}</td><td>{item.format}</td></tr>)}</tbody></table></div> : <EmptyState>Nenhum relatório exportado nesta sessão.</EmptyState>}</Card></div>;
}

function ReportDocument({ data, filters, type, sections }: { data: ReturnType<typeof getDashboardData>; filters: GestorPublicFilters; type: string; sections: ReportSections }) {
  const municipality = filters.municipalities.length === 1 ? data.selected[0]?.name ?? "Município selecionado" : filters.municipalities.length > 1 ? `${filters.municipalities.length} municípios selecionados` : "Todos os municípios";
  const suppliers = data.suppliers.slice(0, 80);
  const municipalities = data.allMunicipalities.filter((item) => !filters.municipalities.length || filters.municipalities.includes(item.id)).sort((a, b) => b.mpeValue - a.mpeValue).slice(0, 80);
  const natureRows = data.natures;
  return <article className="gp-report-document" aria-label="Prévia do relatório exportado">
    <header className="gp-report-cover"><span>COMPRAS ABERTAS · GESTOR PÚBLICO</span><h2>Relatório de Compras Públicas</h2><h3>{municipality.toUpperCase()} · {filters.year}</h3><p>Participação de micro e pequenas empresas nas compras públicas e distribuição dos fornecedores.</p><div className="gp-report-cover-meta"><span>Período consultado <b>{filters.year}</b></span><span>Natureza <b>{filters.nature ? natureName(filters.nature) : "Todas as naturezas"}</b></span><span>Fonte <b>API de pagamentos · backend</b></span></div></header>
    {sections.methodology && <section className="gp-report-section gp-report-page-break"><h3>APRESENTAÇÃO</h3><p>Este relatório resume pagamentos registrados na coleta do período selecionado, incluindo o total pago, o subtotal de microempresas e sua distribuição por natureza da despesa.</p><p>As informações foram organizadas para facilitar a leitura por gestores, empresas e cidadãos, preservando o recorte de município, ano e natureza escolhido no painel.</p><h3 className="gp-report-subheading">METODOLOGIA</h3><p>Os valores vêm dos endpoints de resumo de pagamentos e participação de ME locais da API, consultados pelo backend. A API não fornece evolução mensal dos pagamentos nem distribuição completa de fornecedores por sede.</p><dl className="gp-report-meta"><div><dt>Municípios analisados</dt><dd>{number(data.totals.municipalities)}</dd></div><div><dt>Ano</dt><dd>{filters.year}</dd></div><div><dt>Natureza</dt><dd>{filters.nature ? natureName(filters.nature) : "Todas"}</dd></div><div><dt>Atualização</dt><dd>{new Date().toLocaleDateString("pt-BR")}</dd></div></dl></section>}
    {sections.summary && <section className="gp-report-section"><h3>RESUMO EXECUTIVO</h3><div className="gp-report-kpis"><div><small>Valor total pago</small><b>{currency(data.totals.total)}</b></div><div><small>Valor para ME</small><b>{currency(data.totals.mpeValue)}</b><span>{pct(data.totals.mpePercent)} do total</span></div><div><small>Compras locais</small><b>{currency(data.totals.localValue)}</b></div><div><small>Fornecedores ME</small><b>{number(data.totals.suppliers)}</b></div></div></section>}
    {sections.natures && <section className="gp-report-section gp-report-page-break"><h3>TABELA 01 · PAGAMENTOS POR NATUREZA DA DESPESA</h3><div className="gp-report-table-wrap"><table className="gp-report-table gp-report-table-wide"><thead><tr><th>Natureza da despesa</th><th>Valor pago a ME</th><th>Valor pago a outros portes</th><th>Total pago</th><th>% ME</th></tr></thead><tbody>{natureRows.map((item) => <tr key={item.code}><td>{item.label}</td><td>{currency(item.mpeValue)}</td><td>{currency(Math.max(0, item.value - item.mpeValue))}</td><td>{currency(item.value)}</td><td>{pct(item.mpePercent)}</td></tr>)}</tbody><tfoot><tr><td>Total</td><td>{currency(data.totals.mpeValue)}</td><td>{currency(Math.max(0, data.totals.total - data.totals.mpeValue))}</td><td>{currency(data.totals.total)}</td><td>{pct(data.totals.mpePercent)}</td></tr></tfoot></table></div><small className="gp-report-caption">Fonte: API Compras Abertas, consulta de pagamentos via backend.</small></section>}
    {sections.geography && <section className="gp-report-section gp-report-page-break"><h3>PAGAMENTOS LOCAIS A ME</h3><div className="gp-report-table-wrap"><table className="gp-report-table"><thead><tr><th>Município</th><th>Valor pago a ME local</th><th>% do total pago</th><th>ME locais identificadas</th></tr></thead><tbody>{municipalities.map((item) => <tr key={item.id}><td>{item.name}</td><td>{currency(item.localValue)}</td><td>{pct(item.localPercent)}</td><td>{number(item.suppliers)}</td></tr>)}</tbody></table></div><small className="gp-report-caption">A API não informa separadamente os valores pagos a fornecedores externos ou com sede não identificada.</small></section>}
    {sections.suppliers && <section className="gp-report-section gp-report-page-break"><h3>FORNECEDORES E CLASSIFICAÇÃO EMPRESARIAL</h3><div className="gp-report-table-wrap"><table className="gp-report-table"><thead><tr><th>Fornecedor</th><th>CNPJ</th><th>Município/UF</th><th>Porte</th><th>Natureza</th><th>Valor</th></tr></thead><tbody>{suppliers.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.cnpj}</td><td>{item.municipality}/{item.state}</td><td>{item.size}</td><td>{natureName(item.nature)}</td><td>{currency(item.total)}</td></tr>)}</tbody></table></div></section>}
    {sections.charts && <section className="gp-report-section"><h3>GRÁFICOS E INDICADORES</h3><div className="gp-report-chart">{data.natures.map((item) => <div key={item.code}><span title={item.label}>{item.label}</span><div><i style={{ width: `${Math.max(2, item.value / Math.max(1, ...data.natures.map((row) => row.value)) * 100)}%` }} /></div><b>{currency(item.value)}</b></div>)}</div></section>}
    <footer className="gp-report-footer">Fonte: Compras Abertas · Período consultado: {filters.year} · Relatório gerado em {new Date().toLocaleDateString("pt-BR")}.<br />Valores de pagamentos da coleta consultada na API Compras Abertas.</footer>
  </article>;
}
