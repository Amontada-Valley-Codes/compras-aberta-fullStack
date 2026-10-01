import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft, Building2, CircleDollarSign,
  Info, Search, Store, Users,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PublicFilterSelect } from "@/components/filters/PublicFilterSelect";
import { ExpensesChart, GeneralShareChart, LocalShareChart, MicroenterpriseValueChart, ParticipationChart } from "@/features/public-data/PublicCharts";
import { selectExpenseRows, selectMicroenterpriseValueRows, selectParticipationRows } from "@/features/public-data/chart-selectors";
import { count, formatCnpj, money, percent } from "@/features/public-data/format";
import { ALL_NATURES_LABEL, natureLabel, officialNatureName, titleCase } from "@/features/public-data/plain-language";
import type { AnalysisData } from "@/features/public-data/public-data";
import { AnalysisExportLinks } from "./AnalysisExportLinks";
import type { AnalysisExportSummary } from "./export-charts-pdf";
import { AnalysisPagination } from "./AnalysisPagination";

const EXPENSES_TITLE = "Orçamento previsto por tipo de compra";
const EXPENSES_DESCRIPTION = "Quanto dinheiro foi reservado para cada tipo de compra.";
const EXPENSES_EMPTY = "Nenhum valor previsto no orçamento para estes filtros.";
const PARTICIPATION_TITLE = "Presença de microempresas por tipo de compra";
const PARTICIPATION_DESCRIPTION = "A cada 100 participações em licitações, quantas foram de microempresas.";
const PARTICIPATION_EMPTY = "Nenhuma microempresa participou de licitações com estes filtros.";
const MICRO_VALUE_TITLE = "Quanto as microempresas ganharam por tipo de compra";
const MICRO_VALUE_DESCRIPTION = "Soma dos itens que as microempresas venceram em licitações.";
const MICRO_VALUE_EMPTY = "Nenhum valor ganho por microempresas para estes filtros.";
const SHARE_EMPTY = "Escolha um município nos filtros acima para ver esta informação.";


const KPI_TEXT = {
  value: { label: "Valor ganho por microempresas", detail: "Soma do que elas venceram em licitações." },
  bids: { label: "Licitações com microempresas", detail: "Licitações em que pelo menos uma microempresa participou" },
  participations: { label: "Participações de microempresas", detail: "Cada vez que uma microempresa entrou em uma licitação" },
  companies: { label: "Microempresas", detail: "Microempresas diferentes encontradas nestes dados" },
};

const localShareNote = (total: string, share: number) =>
  `De ${money(total)} ganhos em licitações, ${percent(share)} ficaram com microempresas locais.`;
const generalShareNote = (total: string, share: number) =>
  `De ${money(total)} ganhos em licitações, ${percent(share)} ficaram com microempresas (daqui ou de fora).`;

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
  const localShareTitle = selectedMunicipality ? `Quanto ficou com microempresas de ${selectedMunicipality.name}` : "Quanto ficou com microempresas locais";
  const localShareDescription = `Do total ganho em licitações, a fatia das microempresas com sede ${selectedMunicipality ? `em ${selectedMunicipality.name}` : "no próprio município"}.`;
  const generalShareTitle = "Quanto ficou com microempresas de qualquer cidade";
  const generalShareDescription = `Do total ganho em licitações, a fatia de todas as microempresas, ${selectedMunicipality ? `de ${selectedMunicipality.name}` : "do município"} ou de fora.`;
  const highestNatureName = highestNature ? natureLabel(highestNature.codigo_natureza, highestNature.nome_natureza) : null;

  // Os mesmos filtros/ordenações usados para desenhar os gráficos na tela
  // decidem o que entra no PDF (se o gráfico existe).
  const expensesRows = selectExpenseRows(expenses.data?.data ?? []);
  const participationRows = selectParticipationRows(participation.data?.data ?? []);
  const microValueRows = selectMicroenterpriseValueRows(participation.data?.data ?? []);

  const exportSummary: AnalysisExportSummary = {
    eyebrow: "Análise municipal",
    municipalityName,
    year: filters.year,
    natureName,
    kpis: [
      { label: KPI_TEXT.value.label, value: money(micro.data?.data.valor_total_vencido), detail: KPI_TEXT.value.detail },
      { label: KPI_TEXT.bids.label, value: count(micro.data?.data.quantidade_licitacoes), detail: KPI_TEXT.bids.detail },
      { label: KPI_TEXT.participations.label, value: count(micro.data?.data.quantidade_participacoes), detail: KPI_TEXT.participations.detail },
      { label: KPI_TEXT.companies.label, value: count(micro.data?.data.quantidade_microempresas), detail: KPI_TEXT.companies.detail },
    ],
    highestNatureText: highestNature
      ? `Em ${municipalityName}, o tipo de compra com mais dinheiro previsto no orçamento é "${highestNatureName}": ${money(highestNature.valor_total_dotacao)}. É uma previsão, não o valor já pago.`
      : null,
    chartSections: [
      { id: "export-expenses-chart", title: EXPENSES_TITLE, description: EXPENSES_DESCRIPTION, hasChart: expensesRows.length > 0, emptyText: EXPENSES_EMPTY },
      { id: "export-participation-chart", title: PARTICIPATION_TITLE, description: PARTICIPATION_DESCRIPTION, hasChart: participationRows.length > 0, emptyText: PARTICIPATION_EMPTY },
      { id: "export-microenterprise-chart", title: MICRO_VALUE_TITLE, description: MICRO_VALUE_DESCRIPTION, hasChart: microValueRows.length > 0, emptyText: MICRO_VALUE_EMPTY },
    ],
    shareCharts: [
      {
        id: "export-local-share-chart",
        title: localShareTitle,
        description: localShareDescription,
        emptyText: SHARE_EMPTY,
        data: local.data?.resumo.percentual_valor_vencido_me_local != null
          ? {
            meLabel: "Microempresas locais",
            meValue: money(local.data.resumo.valor_vencido_me_local),
            othersLabel: "Outras empresas",
            othersValue: money(Math.max(0, Number(local.data.resumo.valor_total_vencido) - Number(local.data.resumo.valor_vencido_me_local))),
            note: localShareNote(local.data.resumo.valor_total_vencido, local.data.resumo.percentual_valor_vencido_me_local),
          }
          : null,
      },
      {
        id: "export-general-share-chart",
        title: generalShareTitle,
        description: generalShareDescription,
        emptyText: SHARE_EMPTY,
        data: general.data?.resumo.percentual_valor_vencido_me != null
          ? {
            meLabel: "Microempresas",
            meValue: money(general.data.resumo.valor_vencido_me),
            othersLabel: "Outras empresas",
            othersValue: money(Math.max(0, Number(general.data.resumo.valor_total_vencido) - Number(general.data.resumo.valor_vencido_me))),
            note: generalShareNote(general.data.resumo.valor_total_vencido, general.data.resumo.percentual_valor_vencido_me),
          }
          : null,
      },
    ],
  };
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
            <p>Veja quanto das compras públicas ficou com microempresas e em que tipos de compra elas mais aparecem.</p>
          </div>
          <AnalysisExportLinks filters={filters} summary={exportSummary} />
        </section>

        <form className="analysis-filters" action="/analise" method="get">
          <div className="analysis-filter-fields">
            <input type="hidden" name="limite" value={filters.pageSize} />
            <PublicFilterSelect key={`municipio-${filters.municipalityIbge ?? ""}`} name="municipio" label="Município" allLabel="Todos os municípios" icon="municipality" variant="analysis" defaultValue={filters.municipalityIbge} options={[
              ...(municipalities.data?.map((item) => ({ value: item.ibgeCode, label: item.name })) ?? []),
              ...(filters.municipalityIbge && !municipalities.data?.some((item) => item.ibgeCode === filters.municipalityIbge) ? [{ value: filters.municipalityIbge, label: `Município ${filters.municipalityIbge}` }] : []),
            ]} />
            <PublicFilterSelect key={`natureza-${filters.natureCode ?? ""}`} name="natureza" label="Tipo de compra" allLabel="Todos os tipos" icon="nature" variant="analysis" defaultValue={filters.natureCode} options={[
              ...(expenses.data?.data.map((item) => ({ value: item.codigo_natureza, label: natureLabel(item.codigo_natureza, item.nome_natureza) })) ?? []),
              ...(filters.natureCode && !expenses.data?.data.some((item) => item.codigo_natureza === filters.natureCode) ? [{ value: filters.natureCode, label: natureLabel(filters.natureCode) }] : []),
            ]} />
            <PublicFilterSelect key={`ano-${filters.year}`} name="ano" label="Ano" icon="year" variant="analysis" defaultValue={String(filters.year)} options={[
              { value: "2026", label: "2026" },
              { value: "2025", label: "2025" },
            ]} />
            <button className="analysis-search-button" type="submit" aria-label="Atualizar análise"><Search size={23} /><span>Atualizar análise</span></button>
          </div>
        </form>

        {municipalities.error && <p className="analysis-data-state" role="status">Lista de municípios: {municipalities.error}</p>}
        {filters.municipalityIbge && !selectedMunicipality && <p className="analysis-data-state" role="alert">Não foi possível identificar o município selecionado. Selecione outro município para refazer a consulta.</p>}

        <section className="analysis-results">
          {micro.error && <p className="analysis-data-state" role="status">Indicadores de microempresas: {micro.error}</p>}
          <div className="analysis-kpis">
            <AnalysisKpi icon={<CircleDollarSign />} label={KPI_TEXT.value.label} value={money(micro.data?.data.valor_total_vencido)} detail={KPI_TEXT.value.detail} />
            <AnalysisKpi icon={<Building2 />} label={KPI_TEXT.bids.label} value={count(micro.data?.data.quantidade_licitacoes)} detail={KPI_TEXT.bids.detail} />
            <AnalysisKpi icon={<Store />} label={KPI_TEXT.participations.label} value={count(micro.data?.data.quantidade_participacoes)} detail={KPI_TEXT.participations.detail} accent />
            <AnalysisKpi icon={<Users />} label={KPI_TEXT.companies.label} value={count(micro.data?.data.quantidade_microempresas)} detail={KPI_TEXT.companies.detail} />
          </div>

          {highestNature && <section className="analysis-insight">
            <p>Em {municipalityName}, o tipo de compra com mais dinheiro previsto no orçamento é <strong>{highestNatureName}</strong>: <strong>{money(highestNature.valor_total_dotacao)}</strong>. <span>É uma previsão, não o valor já pago.</span></p>
          </section>}

          <div className="analysis-chart-grid">
            <AnalysisChartCard title={EXPENSES_TITLE} description={EXPENSES_DESCRIPTION} tone="blue">
              {expensesRows.length ? <ExpensesChart data={expenses.data?.data ?? []} /> : <DataState error={expenses.error} fallback={EXPENSES_EMPTY} />}
            </AnalysisChartCard>
            <AnalysisChartCard title={PARTICIPATION_TITLE} description={PARTICIPATION_DESCRIPTION} tone="gold">
              {participationRows.length ? <ParticipationChart data={participation.data?.data ?? []} /> : <DataState error={participation.error} fallback={PARTICIPATION_EMPTY} />}
            </AnalysisChartCard>
            <AnalysisChartCard title={MICRO_VALUE_TITLE} description={MICRO_VALUE_DESCRIPTION} tone="navy">
              {microValueRows.length ? <MicroenterpriseValueChart data={participation.data?.data ?? []} /> : <DataState error={participation.error} fallback={MICRO_VALUE_EMPTY} />}
            </AnalysisChartCard>
            <AnalysisChartCard title={localShareTitle} description={localShareDescription} tone="teal">
              {local.data?.resumo.percentual_valor_vencido_me_local != null ? <div className="analysis-local-chart">
                <LocalShareChart percentage={local.data.resumo.percentual_valor_vencido_me_local} size={230} />
                <div className="analysis-local-metrics">
                  <div><span><i className="analysis-local-dot analysis-local-dot--me" />Microempresas locais</span><strong>{money(local.data.resumo.valor_vencido_me_local)}</strong></div>
                  <div><span><i className="analysis-local-dot analysis-local-dot--total" />Outras empresas</span><strong>{money(Math.max(0, Number(local.data.resumo.valor_total_vencido) - Number(local.data.resumo.valor_vencido_me_local)))}</strong></div>
                </div>
                <p>{localShareNote(local.data.resumo.valor_total_vencido, local.data.resumo.percentual_valor_vencido_me_local)}</p>
              </div>
                : <DataState error={local.error} fallback={SHARE_EMPTY} />}
            </AnalysisChartCard>
            <AnalysisChartCard title={generalShareTitle} description={generalShareDescription} tone="slate">
              {general.data?.resumo.percentual_valor_vencido_me != null ? <div className="analysis-local-chart">
                <GeneralShareChart percentage={general.data.resumo.percentual_valor_vencido_me} size={230} />
                <div className="analysis-local-metrics">
                  <div><span><i className="analysis-local-dot analysis-local-dot--general-me" />Microempresas</span><strong>{money(general.data.resumo.valor_vencido_me)}</strong></div>
                  <div><span><i className="analysis-local-dot analysis-local-dot--general-total" />Outras empresas</span><strong>{money(Math.max(0, Number(general.data.resumo.valor_total_vencido) - Number(general.data.resumo.valor_vencido_me)))}</strong></div>
                </div>
                <p>{generalShareNote(general.data.resumo.valor_total_vencido, general.data.resumo.percentual_valor_vencido_me)}</p>
              </div>
                : <DataState error={general.error} fallback={SHARE_EMPTY} />}
            </AnalysisChartCard>
          </div>

          <section className="analysis-table-card" id="licitacoes">
            <header><div><h2>Licitações encontradas</h2><p>Cada linha mostra uma empresa que ganhou itens em uma licitação. São registros passados: antes de participar, confira se a licitação ainda está aberta no edital oficial.</p></div></header>
            {rows.length ? <div className="analysis-table-scroll"><table>
              <thead><tr><th>Nº da licitação</th><th>Empresa vencedora</th><th>CNPJ</th><th>Município</th><th>Tipo de compra</th><th>Ano</th><th>Valor ganho</th></tr></thead>
              <tbody>{rows.map((bid, index) => <tr key={`${bid.codigo_municipio}-${bid.numero_licitacao}-${bid.cnpj}-${index}`}>
                <td><b>{bid.numero_licitacao}</b></td><td><span className="analysis-table-ellipsis" title={bid.empresa ?? "Não informada"}>{bid.empresa ?? "Não informada"}</span></td><td>{formatCnpj(bid.cnpj)}</td><td>{titleCase(bid.municipio)}</td><td><span className="analysis-table-ellipsis" title={officialNatureName(bid.nome_natureza)}>{natureLabel(bid.codigo_natureza, bid.nome_natureza)}</span></td><td>{bid.ano_licitacao}</td><td><strong>{money(bid.valor_total_vencido)}</strong></td>
              </tr>)}</tbody>
            </table></div> : <DataState error={bids.error} fallback="Nenhuma licitação encontrada para estes filtros." />}
            <AnalysisPagination filters={filters} rowCount={rows.length} hasNext={(bids.data?.data.length ?? 0) > filters.pageSize} />
          </section>
          <p className="analysis-footnote"><Info /> A planilha (CSV) traz todas as licitações dos filtros escolhidos. O PDF traz os gráficos desta página.</p>
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
  return <p className="analysis-data-state" role="status">{error ?? fallback}</p>;
}
