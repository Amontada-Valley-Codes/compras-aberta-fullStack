import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft, Building2, CircleDollarSign,
  Info, Search, Store, Users,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PublicFilterSelect } from "@/components/filters/PublicFilterSelect";
import { ExpensesChart, LocalShareChart, MicroenterpriseValueChart, ParticipationChart } from "@/features/public-data/PublicCharts";
import { count, formatCnpj, money, percent } from "@/features/public-data/format";
import type { AnalysisData } from "@/features/public-data/public-data";
import { AnalysisExportLinks } from "./AnalysisExportLinks";
import { AnalysisPagination } from "./AnalysisPagination";

export function MunicipalityAnalysisPage({ data }: { data: AnalysisData }) {
  const { filters, selectedMunicipality, municipalities, micro, expenses, participation, local, bids } = data;
  const municipalityName = selectedMunicipality?.name ?? "Ceará";
  const natureName = expenses.data?.data.find((item) => item.codigo_natureza === filters.natureCode)?.nome_natureza ?? "todas as naturezas";
  const rows = bids.data?.data.slice(0, filters.pageSize) ?? [];
  const highestNature = expenses.data?.data.reduce<typeof expenses.data.data[number] | null>(
    (best, item) => !best || Number(item.valor_total_dotacao) > Number(best.valor_total_dotacao) ? item : best,
    null,
  );
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
            <h1>Licitações e participação de ME em {municipalityName}</h1>
            <p>Indicadores e registros de <b>{natureName.toLowerCase()}</b> em {filters.year}. Os gráficos por natureza comparam todas as naturezas.</p>
          </div>
          <AnalysisExportLinks filters={filters} />
        </section>

        <form className="analysis-filters" action="/analise" method="get">
          <div className="analysis-filter-fields">
            <input type="hidden" name="limite" value={filters.pageSize} />
            <PublicFilterSelect key={`municipio-${filters.municipalityIbge ?? ""}`} name="municipio" label="Município" allLabel="Todos os municípios" icon="municipality" variant="analysis" defaultValue={filters.municipalityIbge} options={[
              ...(municipalities.data?.map((item) => ({ value: item.ibgeCode, label: item.name })) ?? []),
              ...(filters.municipalityIbge && !municipalities.data?.some((item) => item.ibgeCode === filters.municipalityIbge) ? [{ value: filters.municipalityIbge, label: `Município ${filters.municipalityIbge}` }] : []),
            ]} />
            <PublicFilterSelect key={`natureza-${filters.natureCode ?? ""}`} name="natureza" label="Natureza da despesa" allLabel="Todas as naturezas" icon="nature" variant="analysis" defaultValue={filters.natureCode} options={[
              ...(expenses.data?.data.map((item) => ({ value: item.codigo_natureza, label: item.nome_natureza })) ?? []),
              ...(filters.natureCode && !expenses.data?.data.some((item) => item.codigo_natureza === filters.natureCode) ? [{ value: filters.natureCode, label: `Natureza ${filters.natureCode}` }] : []),
            ]} />
            <PublicFilterSelect key={`ano-${filters.year}`} name="ano" label="Exercício" icon="year" variant="analysis" defaultValue={String(filters.year)} options={[
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
            <AnalysisKpi icon={<CircleDollarSign />} label="Valor vencido por ME" value={money(micro.data?.data.valor_total_vencido)} detail="Valor vencido nas licitações filtradas" />
            <AnalysisKpi icon={<Building2 />} label="Licitações com ME" value={count(micro.data?.data.quantidade_licitacoes)} detail="Licitações com participação de microempresas" />
            <AnalysisKpi icon={<Store />} label="Participações de ME" value={count(micro.data?.data.quantidade_participacoes)} detail="Participações registradas" accent />
            <AnalysisKpi icon={<Users />} label="Microempresas" value={count(micro.data?.data.quantidade_microempresas)} detail="Empresas identificadas na base" />
          </div>

          {highestNature && <section className="analysis-insight">
            <p>Em {municipalityName}, a maior dotação é para <strong>{highestNature.nome_natureza.toLowerCase()}</strong>: <strong>{money(highestNature.valor_total_dotacao)}</strong>. <span>Esse valor não indica quanto foi pago.</span></p>
          </section>}

          <div className="analysis-chart-grid">
            <AnalysisChartCard title="Valor de dotações por natureza" description="Valor associado às contratações, sem representar pagamento efetivo. Naturezas sem valor positivo não aparecem." tone="blue">
              {expenses.data?.data.length ? <ExpensesChart data={expenses.data.data} /> : <DataState error={expenses.error} />}
            </AnalysisChartCard>
            <AnalysisChartCard title="Participação de ME por natureza" description="Percentual de participações de microempresas. Naturezas com 0% não aparecem." tone="gold">
              {participation.data?.data.length ? <ParticipationChart data={participation.data.data} /> : <DataState error={participation.error} />}
            </AnalysisChartCard>
            <AnalysisChartCard title="Valor vencido por ME por natureza" description="Compare os valores vencidos por ME entre as naturezas da despesa. Naturezas sem valor positivo não aparecem." tone="navy">
              {participation.data?.data.length ? <MicroenterpriseValueChart data={participation.data.data} /> : <DataState error={participation.error} />}
            </AnalysisChartCard>
            <AnalysisChartCard title={selectedMunicipality ? `Valor vencido por ME locais em ${selectedMunicipality.name}` : "Valor vencido por ME locais"} description={`Percentual do valor total vencido que ficou com ME do próprio município em ${filters.year}, considerando todas as naturezas.`} tone="teal">
              {local.data?.resumo.percentual_valor_vencido_me_local != null ? <div className="analysis-local-chart">
                <LocalShareChart percentage={local.data.resumo.percentual_valor_vencido_me_local} size={230} />
                <div className="analysis-local-metrics">
                  <div><span><i className="analysis-local-dot analysis-local-dot--me" />ME locais</span><strong>{money(local.data.resumo.valor_vencido_me_local)}</strong></div>
                  <div><span><i className="analysis-local-dot analysis-local-dot--total" />Demais fornecedores</span><strong>{money(Math.max(0, Number(local.data.resumo.valor_total_vencido) - Number(local.data.resumo.valor_vencido_me_local)))}</strong></div>
                </div>
                <p>De {money(local.data.resumo.valor_total_vencido)} no total, ME locais receberam {percent(local.data.resumo.percentual_valor_vencido_me_local)}.</p>
              </div>
                : <DataState error={local.error} fallback="Selecione um município para consultar a participação local." />}
            </AnalysisChartCard>
          </div>

          <section className="analysis-table-card" id="licitacoes">
            <header><div><h2>Licitações detalhadas</h2><p>Registros retornados para os filtros aplicados; a API não informa se ainda estão abertos.</p></div></header>
            {rows.length ? <div className="analysis-table-scroll"><table>
              <thead><tr><th>Licitação</th><th>Empresa</th><th>CNPJ</th><th>Município</th><th>Natureza</th><th>Ano</th><th>Valor vencido</th></tr></thead>
              <tbody>{rows.map((bid, index) => <tr key={`${bid.codigo_municipio}-${bid.numero_licitacao}-${bid.cnpj}-${index}`}>
                <td><b>{bid.numero_licitacao}</b></td><td><span className="analysis-table-ellipsis" title={bid.empresa ?? "Não informada"}>{bid.empresa ?? "Não informada"}</span></td><td>{formatCnpj(bid.cnpj)}</td><td>{bid.municipio}</td><td><span className="analysis-table-ellipsis" title={bid.nome_natureza}>{bid.nome_natureza}</span></td><td>{bid.ano_licitacao}</td><td><strong>{money(bid.valor_total_vencido)}</strong></td>
              </tr>)}</tbody>
            </table></div> : <DataState error={bids.error} fallback="Nenhuma licitação encontrada para estes filtros." />}
            <AnalysisPagination filters={filters} rowCount={rows.length} hasNext={(bids.data?.data.length ?? 0) > filters.pageSize} />
          </section>
          <p className="analysis-footnote"><Info /> Os arquivos CSV incluem todos os registros dos filtros e os dados usados nos gráficos.</p>
        </section>
      </main>
    </div>
  );
}

function AnalysisKpi({ icon, label, value, detail, accent }: { icon: ReactNode; label: string; value: string; detail: string; accent?: boolean }) {
  return <article className={accent ? "accent" : ""}><div><span>{icon}</span><small>{label}</small></div><strong>{value}</strong><p>{detail}</p></article>;
}

function AnalysisChartCard({ title, description, tone, children }: { title: string; description: string; tone: string; children: ReactNode }) {
  return <article className={`analysis-chart-card analysis-chart-card--${tone}`}><header><div><h2>{title}</h2><p>{description}</p></div></header>{children}</article>;
}

function DataState({ error, fallback = "Sem dados para os filtros selecionados." }: { error: string | null; fallback?: string }) {
  return <p className="analysis-data-state" role="status">{error ?? fallback}</p>;
}
