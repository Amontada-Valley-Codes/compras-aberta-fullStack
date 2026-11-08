import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, CircleDollarSign, Search, SearchX, Store, MapPinned } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PublicFilterSelect } from "@/components/filters/PublicFilterSelect";
import { GeneralShareChart, LocalShareChart } from "@/features/public-data/PublicCharts";
import { AnalysisExpensesChart, AnalysisParticipationChart, AnalysisMicroValueChart } from "./AnalysisNatureCharts";
import { selectAnalysisExpenses, selectAnalysisParticipation } from "./analysis-selectors";
import { count, money } from "@/features/public-data/format";
import { natureLabel } from "@/features/public-data/plain-language";
import type { AnalysisData } from "@/features/public-data/public-data";
import { AnalysisPagination } from "./AnalysisPagination";
import { AnalysisWinnersTable } from "./AnalysisWinnersTable";

const NATURE_EMPTY = "A API não retornou dados associados a naturezas da despesa para estes filtros. Isso não significa ausência de licitações ou de valores vencidos.";
const MUNICIPALITY_REQUIRED = "Selecione um município para consultar esta informação.";

export function MunicipalityAnalysisPage({ data }: { data: AnalysisData }) {
  const { filters, selectedMunicipality, municipalities, expenses, participation, micro, local, general, bids } = data;
  const municipalityName = selectedMunicipality?.name ?? "Ceará";
  const expenseRows = selectAnalysisExpenses(expenses.data?.data ?? [], filters.natureCode);
  const participationRows = selectAnalysisParticipation(participation.data?.data ?? [], filters.natureCode);
  const highestNature = expenseRows[0];
  const rows = bids.data?.data ?? [];
  const exportParams = new URLSearchParams({ tipo: "licitacoes", municipio: filters.municipalityIbge ?? "", ano: String(filters.year) });
  if (filters.natureCode) exportParams.set("natureza", filters.natureCode);
  return <div className="analysis-page">
    <header className="analysis-header"><div className="analysis-container"><BrandLogo /><nav><Link href="/me">Área da microempresa</Link></nav></div></header>
    <main className="analysis-container analysis-main">
      <Link className="analysis-back" href="/"><ArrowLeft /> Voltar para a página inicial</Link>
      <section className="analysis-title-row"><div><h1>Licitações e microempresas em {municipalityName}</h1><p>Veja as dotações por natureza da despesa, os valores vencidos e a participação das microempresas nas licitações.</p></div></section>
        <form className="analysis-filters" action="/analise" method="get">
          <div className="analysis-filter-fields">
            <input type="hidden" name="limite" value={filters.pageSize} />
            {filters.natureCode && <input type="hidden" name="natureza" value={filters.natureCode} />}
            <PublicFilterSelect key={`municipio-${filters.municipalityIbge ?? ""}`} name="municipio" label="Município" allLabel="Todos os municípios" icon="municipality" variant="analysis" defaultValue={filters.municipalityIbge} options={[
              ...(municipalities.data?.map((item) => ({ value: item.ibgeCode, label: item.name })) ?? []),
              ...(filters.municipalityIbge && !municipalities.data?.some((item) => item.ibgeCode === filters.municipalityIbge) ? [{ value: filters.municipalityIbge, label: `Município ${filters.municipalityIbge}` }] : []),
            ]} />
            <PublicFilterSelect key={`ano-${filters.year}`} name="ano" label="Ano" icon="year" variant="analysis" defaultValue={String(filters.year)} options={[
              { value: "2026", label: "2026" },
              { value: "2025", label: "2025" },
              { value: "2024", label: "2024" },
            ]} />
            <button className="analysis-search-button" type="submit" aria-label="Consultar dados"><Search size={23} /><span>Consultar dados</span></button>
          </div>
        </form>
        {municipalities.error && <DataState error={`Lista de municípios: ${municipalities.error}`} />}
        {filters.municipalityIbge && !selectedMunicipality && <DataState error="Não foi possível identificar o município selecionado. Selecione outro município para refazer a consulta." />}
      <section className="analysis-results">
        {micro.error && <DataState error={micro.error} />}
        <div className="analysis-kpis">
          <AnalysisKpi icon={<CircleDollarSign />} label="Valor de compra para ME" value={money(micro.data?.data.valor_total_vencido)} detail="Soma dos valores vencidos por microempresas nas licitações do período." />
          <AnalysisKpi icon={<Store />} label="Participações de ME" value={count(micro.data?.data.quantidade_participacoes)} detail="Registros de microempresas vencedoras; uma empresa pode vencer várias licitações." accent />
          <AnalysisKpi icon={<MapPinned />} label="Compras com ME locais" value={money(local.data?.resumo.valor_vencido_me_local)} detail={selectedMunicipality ? "Valor vencido por microempresas sediadas no município." : MUNICIPALITY_REQUIRED} />
        </div>
        {local.error && <DataState error={`Microempresas locais: ${local.error}`} />}
        {highestNature && <section className="analysis-insight"><p>Em {municipalityName}, a maior dotação associada às licitações de {filters.year} é <strong>{natureLabel(highestNature.codigo_natureza, highestNature.nome_natureza)}</strong>: <strong>{money(highestNature.valor_total_dotacao)}</strong>.</p></section>}
        <div className="analysis-chart-grid">
          <AnalysisChartCard title="Valor de compra para ME por natureza da despesa" description="Valores vencidos por microempresas nas licitações associadas a cada natureza." tone="navy">
            {participationRows.length ? <AnalysisMicroValueChart data={participationRows} /> : <DataState error={participation.error} fallback={NATURE_EMPTY} />}
            {participation.data?.observacao && <p className="analysis-footnote">{participation.data.observacao}</p>}
          </AnalysisChartCard>
          <AnalysisChartCard title="Participação das microempresas nas compras" description="Parcela do valor vencido nas licitações destinada a ME locais e a ME de qualquer origem." tone="teal">
            <div className="analysis-share-comparison">
              <div className="analysis-share-item"><h3>Compras com ME locais</h3>
                {local.data?.resumo.percentual_valor_vencido_me_local != null ? <><LocalShareChart percentage={local.data.resumo.percentual_valor_vencido_me_local} size={230} /><p>{money(local.data.resumo.valor_vencido_me_local)} vencidos por ME locais</p></> : <DataState error={local.error} fallback={selectedMunicipality ? "Sem base para calcular o percentual local." : MUNICIPALITY_REQUIRED} />}
              </div>
              <div className="analysis-share-item"><h3>Compras com ME em geral</h3>
                {general.data?.resumo.percentual_valor_vencido_me != null ? <><GeneralShareChart percentage={general.data.resumo.percentual_valor_vencido_me} size={230} /><p>{money(general.data.resumo.valor_vencido_me)} vencidos por ME</p></> : <DataState error={general.error} fallback={selectedMunicipality ? "Sem base para calcular o percentual de ME." : MUNICIPALITY_REQUIRED} />}
              </div>
            </div>
          </AnalysisChartCard>
          <AnalysisChartCard title="Compras por natureza da despesa" description="Valor das dotações associadas às licitações em cada natureza da despesa." tone="blue">
            {expenseRows.length ? <AnalysisExpensesChart data={expenseRows} /> : <DataState error={expenses.error} fallback={NATURE_EMPTY} />}
            {expenses.data?.observacao && <p className="analysis-footnote">{expenses.data.observacao}</p>}
          </AnalysisChartCard>
          <AnalysisChartCard title="Participações de ME por natureza da despesa" description="Percentual dos registros de vencedores que são de microempresas em cada natureza." tone="gold">
            {participationRows.length ? <AnalysisParticipationChart data={participationRows} /> : <DataState error={participation.error} fallback={NATURE_EMPTY} />}
          </AnalysisChartCard>
        </div>
        <section className="analysis-table-card" id="licitacoes">
          <header><div><h2>Licitações com microempresas</h2><p>Cada linha mostra uma microempresa vencedora, a licitação e o valor vencido. A natureza selecionada é aplicada à consulta.</p></div>{bids.data && <a className="ds-button secondary" href={`/analise/exportar?${exportParams}`}>Exportar licitações (CSV)</a>}</header>
          {rows.length ? <AnalysisWinnersTable rows={rows} /> : <DataState error={bids.error} fallback={selectedMunicipality ? "Nenhuma microempresa vencedora encontrada para estes filtros." : MUNICIPALITY_REQUIRED} />}
          {selectedMunicipality && <AnalysisPagination filters={filters} rowCount={rows.length} hasNext={data.hasNext} />}
        </section>
      </section>
    </main>
  </div>;
}

function AnalysisKpi({ icon, label, value, detail, accent }: { icon: ReactNode; label: string; value: string; detail: string; accent?: boolean }) {
  return <article className={accent ? "accent" : ""}><div><span>{icon}</span><small>{label}</small></div><strong>{value}</strong><p>{detail}</p></article>;
}

function AnalysisChartCard({ title, description, tone, children }: { title: string; description: string; tone: string; children: ReactNode }) {
  return <article className={`analysis-chart-card analysis-chart-card--${tone}`}>
    <header><div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div></header>
    {children}
  </article>;
}

function DataState({ error, fallback = "Sem dados para os filtros selecionados." }: { error: string | null; fallback?: string }) {
  const message = error ?? fallback;
  return <div className="analysis-data-state" role="status">
    <SearchX aria-hidden="true" />
    <strong>{error ? "Não foi possível carregar estes dados" : "Nenhum dado encontrado"}</strong>
    <span>{message}</span>
  </div>;
}
