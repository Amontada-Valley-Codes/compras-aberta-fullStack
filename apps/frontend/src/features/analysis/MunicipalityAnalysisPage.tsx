import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft, CircleDollarSign, MapPinned,
  Info, Search, SearchX, Store,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PublicFilterSelect } from "@/components/filters/PublicFilterSelect";
import { ExpensesChart, GeneralShareChart, LocalShareChart, MicroenterpriseValueChart, ParticipationChart } from "@/features/public-data/PublicCharts";
import { selectExpenseRows, selectMicroenterpriseValueRows, selectParticipationRows } from "@/features/public-data/chart-selectors";
import { count, money, percent } from "@/features/public-data/format";
import { ALL_NATURES_LABEL, natureLabel } from "@/features/public-data/plain-language";
import type { AnalysisData } from "@/features/public-data/public-data";
import { AnalysisPagination } from "./AnalysisPagination";
import { AnalysisBidsTable } from "./AnalysisBidsTable";

const EXPENSES_TITLE = "Compras por natureza da despesa";
const EXPENSES_DESCRIPTION = "Veja o valor previsto no orçamento para cada um dos sete tipos de compra.";
const EXPENSES_EMPTY = "Nenhum valor previsto no orçamento para estes filtros.";
const PARTICIPATION_TITLE = "Participação de ME por natureza da despesa";
const PARTICIPATION_DESCRIPTION = "A cada 100 participações, quantas foram de microempresas.";
const PARTICIPATION_EMPTY = "Nenhuma microempresa participou de licitações com estes filtros.";
const MICRO_VALUE_TITLE = "Valor homologado para ME por natureza da despesa";
const MICRO_VALUE_DESCRIPTION = "Soma dos valores homologados para microempresas em cada tipo de compra.";
const MICRO_VALUE_EMPTY = "Nenhum valor homologado para microempresas nestes filtros.";
const SHARE_EMPTY = "Escolha um município nos filtros acima para ver esta informação.";


const KPI_TEXT = {
  value: { label: "Valor homologado para ME", detail: "Soma dos valores de licitações vencidas por microempresas." },
  localValue: { label: "Compras com ME locais", detail: "Valor destinado a empresas sediadas no próprio município." },
  participations: { label: "Participações de ME", detail: "Registros de participação de microempresas." },
};

const localShareNote = (total: string, share: number) =>
  `De ${money(total)} homologados em licitações, ${percent(share)} ficaram com microempresas locais.`;
const generalShareNote = (total: string, share: number) =>
  `De ${money(total)} homologados em licitações, ${percent(share)} ficaram com microempresas, daqui ou de fora.`;

export function MunicipalityAnalysisPage({ data }: { data: AnalysisData }) {
  const { filters, selectedMunicipality, municipalities, micro, expenses, participation, local, general, bids } = data;
  const municipalityName = selectedMunicipality?.name ?? "Ceará";
  const selectedNature = expenses.data?.data.find((item) => item.codigo_natureza === filters.natureCode);
  const natureName = filters.natureCode ? natureLabel(filters.natureCode, selectedNature?.nome_natureza) : ALL_NATURES_LABEL;
  const rows = bids.data?.data.slice(0, filters.pageSize) ?? [];
  const highestNature = expenses.data?.data.reduce<typeof expenses.data.data[number] | null>(
    (best, item) => !best || Number(item.valor_total_dotacao) > Number(best.valor_total_dotacao) ? item : best,
    null,
  );
  const localShareTitle = selectedMunicipality ? `Percentual de compras com ME locais em ${selectedMunicipality.name}` : "Percentual de compras com ME locais";
  const localShareDescription = `Percentual do valor homologado que ficou com empresas sediadas ${selectedMunicipality ? `em ${selectedMunicipality.name}` : "no próprio município"}.`;
  const generalShareTitle = "Percentual de compras com ME";
  const generalShareDescription = `Percentual do valor homologado que ficou com microempresas, ${selectedMunicipality ? `de ${selectedMunicipality.name}` : "do município"} ou de fora.`;
  const highestNatureName = highestNature ? natureLabel(highestNature.codigo_natureza, highestNature.nome_natureza) : null;
  const visibleExpenses = filters.natureCode
    ? (expenses.data?.data ?? []).filter((item) => item.codigo_natureza === filters.natureCode)
    : expenses.data?.data ?? [];
  const visibleParticipation = filters.natureCode
    ? (participation.data?.data ?? []).filter((item) => item.codigo_natureza === filters.natureCode)
    : participation.data?.data ?? [];
  const expensesRows = selectExpenseRows(visibleExpenses);
  const participationRows = selectParticipationRows(visibleParticipation);
  const microValueRows = selectMicroenterpriseValueRows(visibleParticipation);

  return (
    <div className="analysis-page">
      <header className="analysis-header">
        <div className="analysis-container">
          <BrandLogo />
          <nav><Link href="/me">Área da microempresa</Link></nav>
        </div>
      </header>

      <main className="analysis-container analysis-main">
        <Link className="analysis-back" href="/"><ArrowLeft /> Voltar para a busca</Link>
        <section className="analysis-title-row">
          <div>
            <h1>Licitações e microempresas em {municipalityName}</h1>
            <p>Veja como as compras públicas foram distribuídas entre os sete tipos de despesa e a participação das microempresas.</p>
          </div>
        </section>

        <form className="analysis-filters" action="/analise" method="get">
          <div className="analysis-filter-fields">
            <input type="hidden" name="limite" value={filters.pageSize} />
            <PublicFilterSelect key={`municipio-${filters.municipalityIbge ?? ""}`} name="municipio" label="Município" allLabel="Todos os municípios" icon="municipality" variant="analysis" defaultValue={filters.municipalityIbge} options={[
              ...(municipalities.data?.map((item) => ({ value: item.ibgeCode, label: item.name })) ?? []),
              ...(filters.municipalityIbge && !municipalities.data?.some((item) => item.ibgeCode === filters.municipalityIbge) ? [{ value: filters.municipalityIbge, label: `Município ${filters.municipalityIbge}` }] : []),
            ]} />
            <PublicFilterSelect key={`ano-${filters.year}`} name="ano" label="Ano" icon="year" variant="analysis" defaultValue={String(filters.year)} options={[
              { value: "2026", label: "2026" },
              { value: "2025", label: "2025" },
            ]} />
            <button className="analysis-search-button" type="submit" aria-label="Consultar dados"><Search size={23} /><span>Consultar dados</span></button>
          </div>
        </form>
        {municipalities.error && <DataState error={`Lista de municípios: ${municipalities.error}`} />}
        {filters.municipalityIbge && !selectedMunicipality && <DataState error="Não foi possível identificar o município selecionado. Selecione outro município para refazer a consulta." />}

        <section className="analysis-results">
          {micro.error && <DataState error={`Indicadores de microempresas: ${micro.error}`} />}
          <div className="analysis-kpis">
            <AnalysisKpi icon={<CircleDollarSign />} label={KPI_TEXT.value.label} value={money(micro.data?.data.valor_total_vencido)} detail={KPI_TEXT.value.detail} />
            <AnalysisKpi icon={<Store />} label={KPI_TEXT.participations.label} value={count(micro.data?.data.quantidade_participacoes)} detail={KPI_TEXT.participations.detail} accent />
            <AnalysisKpi icon={<MapPinned />} label={KPI_TEXT.localValue.label} value={money(local.data?.resumo.valor_vencido_me_local)} detail={KPI_TEXT.localValue.detail} />
          </div>

          {highestNature && <section className="analysis-insight">
            <p>Em {municipalityName}, a maior dotação prevista é <strong>{highestNatureName}</strong>: <strong>{money(highestNature.valor_total_dotacao)}</strong>.</p>
          </section>}

          <div className="analysis-chart-grid">
            <AnalysisChartCard title={MICRO_VALUE_TITLE} description={MICRO_VALUE_DESCRIPTION} tone="navy">
              {microValueRows.length ? <MicroenterpriseValueChart data={visibleParticipation} /> : <DataState error={participation.error} fallback={MICRO_VALUE_EMPTY} />}
            </AnalysisChartCard>
            <AnalysisChartCard title="Participação das microempresas nas compras" description="Compare a participação geral das microempresas com a participação das empresas sediadas no município." tone="teal">
              <div className="analysis-share-comparison">
                <div className="analysis-share-item">
                  <h3>Compras com ME locais</h3>
                  {local.data?.resumo.percentual_valor_vencido_me_local != null ? <>
                    <LocalShareChart percentage={local.data.resumo.percentual_valor_vencido_me_local} size={230} />
                    <p>{money(local.data.resumo.valor_vencido_me_local)} em compras locais</p>
                  </> : <DataState error={local.error} fallback={SHARE_EMPTY} />}
                </div>
                <div className="analysis-share-item">
                  <h3>Compras com ME em geral</h3>
                  {general.data?.resumo.percentual_valor_vencido_me != null ? <>
                    <GeneralShareChart percentage={general.data.resumo.percentual_valor_vencido_me} size={230} />
                    <p>{money(general.data.resumo.valor_vencido_me)} em compras com ME</p>
                  </> : <DataState error={general.error} fallback={SHARE_EMPTY} />}
                </div>
              </div>
            </AnalysisChartCard>
            <AnalysisChartCard title={EXPENSES_TITLE} description={EXPENSES_DESCRIPTION} tone="blue">
              {expensesRows.length ? <ExpensesChart data={visibleExpenses} /> : <DataState error={expenses.error} fallback={EXPENSES_EMPTY} />}
            </AnalysisChartCard>
            <AnalysisChartCard title="Participações de ME por natureza da despesa" description="Percentual de participações de microempresas em cada tipo de compra." tone="gold">
              {participationRows.length ? <ParticipationChart data={visibleParticipation} /> : <DataState error={participation.error} fallback={PARTICIPATION_EMPTY} />}
            </AnalysisChartCard>
          </div>

          <section className="analysis-table-card" id="licitacoes">
            <header><div><h2>Licitações com microempresas</h2><p>Cada linha mostra uma microempresa vencedora e o valor homologado na licitação. São registros passados: antes de participar, confira o edital oficial.</p></div></header>
            {rows.length ? <AnalysisBidsTable rows={rows} /> : <DataState error={bids.error} fallback="Nenhuma licitação encontrada para estes filtros." />}
            <AnalysisPagination filters={filters} rowCount={rows.length} hasNext={(bids.data?.data.length ?? 0) > filters.pageSize} />
          </section>
          <p className="analysis-footnote"><Info /> A planilha (CSV) traz todas as licitações dos filtros escolhidos.</p>
        </section>
      </main>
    </div>
  );
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
