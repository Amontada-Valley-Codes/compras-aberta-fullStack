import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft, Building2, CalendarDays, ChevronDown, CircleDollarSign,
  Database, FileBarChart, Info, MapPin, Search, Store, Users,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ExpensesChart, LocalShareChart, MicroenterpriseValueChart, ParticipationChart } from "@/features/public-data/PublicCharts";
import { count, maskCnpj, money, percent } from "@/features/public-data/format";
import type { AnalysisData } from "@/features/public-data/public-data";
import { ExportBidsButton } from "./ExportBidsButton";

export function MunicipalityAnalysisPage({ data }: { data: AnalysisData }) {
  const { filters, selectedMunicipality, municipalities, micro, expenses, participation, local, bids } = data;
  const municipalityName = selectedMunicipality?.name ?? "Ceará";
  const natureName = expenses.data?.data.find((item) => item.codigo_natureza === filters.natureCode)?.nome_natureza ?? "todas as naturezas";
  const rows = bids.data?.data.slice(0, filters.pageSize) ?? [];
  const highestNature = expenses.data?.data.reduce<typeof expenses.data.data[number] | null>(
    (best, item) => !best || Number(item.valor_total_dotacao) > Number(best.valor_total_dotacao) ? item : best,
    null,
  );
  const pageLink = (page: number) => {
    const params = new URLSearchParams({ ano: String(filters.year), pagina: String(page), limite: String(filters.pageSize) });
    if (filters.municipalityIbge) params.set("municipio", filters.municipalityIbge);
    if (filters.natureCode) params.set("natureza", filters.natureCode);
    return `/analise?${params.toString()}`;
  };

  return (
    <div className="analysis-page">
      <header className="analysis-header">
        <div className="analysis-container">
          <BrandLogo />
          <nav><Link href="/">Portal público</Link><Link href="/me">Área da microempresa</Link></nav>
        </div>
      </header>

      <main className="analysis-container analysis-main">
        <Link className="analysis-back" href="/"><ArrowLeft /> Voltar para a busca</Link>
        <section className="analysis-title-row">
          <div>
            <span>PAINEL DE COMPRAS PÚBLICAS</span>
            <h1>Licitações e participação de ME em {municipalityName}</h1>
            <p>Indicadores e registros de <b>{natureName.toLowerCase()}</b> em {filters.year}. Os gráficos por natureza comparam todas as naturezas.</p>
          </div>
          <ExportBidsButton bids={rows.map((bid) => ({
            numero_licitacao: bid.numero_licitacao,
            empresa: bid.empresa,
            cnpjMascarado: maskCnpj(bid.cnpj),
            municipio: bid.municipio,
            nome_natureza: bid.nome_natureza,
            ano_licitacao: bid.ano_licitacao,
            valor_total_vencido: bid.valor_total_vencido,
          }))} />
        </section>

        <form className="analysis-filters" action="/analise" method="get">
          <input type="hidden" name="limite" value={filters.pageSize} />
          <label><MapPin /><span><small>Município</small>
            <select name="municipio" defaultValue={filters.municipalityIbge ?? ""}>
              <option value="">Todos os municípios</option>
              {municipalities.data?.map((item) => <option key={item.ibgeCode} value={item.ibgeCode}>{item.name}</option>)}
            </select>
          </span><ChevronDown /></label>
          <label><FileBarChart /><span><small>Natureza da despesa</small>
            <select name="natureza" defaultValue={filters.natureCode ?? ""}>
              <option value="">Todas as naturezas</option>
              {expenses.data?.data.map((item) => <option key={item.codigo_natureza} value={item.codigo_natureza}>{item.nome_natureza}</option>)}
              {filters.natureCode && !expenses.data?.data.some((item) => item.codigo_natureza === filters.natureCode) && <option value={filters.natureCode}>Natureza {filters.natureCode}</option>}
            </select>
          </span><ChevronDown /></label>
          <label><CalendarDays /><span><small>Exercício</small>
            <select name="ano" defaultValue={String(filters.year)}>
              {Array.from({ length: 7 }, (_, index) => new Date().getUTCFullYear() - index).map((year) => <option key={year} value={year}>{year}</option>)}
              {filters.year < new Date().getUTCFullYear() - 6 && <option value={filters.year}>{filters.year}</option>}
            </select>
          </span><ChevronDown /></label>
          <button className="ds-button primary" type="submit"><Search size={17} /> Atualizar análise</button>
        </form>

        <section className="analysis-source-note">
          <Database />
          <p><b>Fonte: API pública Compra Aberta</b><span>Consultas feitas ao abrir esta página; os dados não informam a data de atualização da base.</span></p>
          <em><i /> Consulta pública</em>
        </section>
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
            <span><Info /></span>
            <div><small>LEITURA RÁPIDA</small><p>Entre todas as naturezas, a maior dotação registrada em {municipalityName} está em <b>{highestNature.nome_natureza.toLowerCase()}</b>, com <b>{money(highestNature.valor_total_dotacao)}</b>. Dotação não representa pagamento efetivo.</p></div>
          </section>}

          <div className="analysis-chart-grid">
            <AnalysisChartCard title="Valor de dotações por natureza" description="Valor associado às contratações, sem representar pagamento efetivo." tone="blue">
              {expenses.data?.data.length ? <ExpensesChart data={expenses.data.data} /> : <DataState error={expenses.error} />}
            </AnalysisChartCard>
            <AnalysisChartCard title="Participação de ME por natureza" description="Percentual de participações de microempresas." tone="gold">
              {participation.data?.data.length ? <ParticipationChart data={participation.data.data} /> : <DataState error={participation.error} />}
            </AnalysisChartCard>
            <AnalysisChartCard title="Valor vencido por ME por natureza" description="Compare os valores vencidos por ME entre as naturezas da despesa." tone="navy">
              {participation.data?.data.length ? <MicroenterpriseValueChart data={participation.data.data} /> : <DataState error={participation.error} />}
            </AnalysisChartCard>
            <AnalysisChartCard title={selectedMunicipality ? `Valor vencido por ME locais em ${selectedMunicipality.name}` : "Valor vencido por ME locais"} description={`Percentual do valor total vencido que ficou com ME do próprio município em ${filters.year}, considerando todas as naturezas.`} tone="teal">
              {local.data?.resumo.percentual_valor_vencido_me_local != null ? <div className="analysis-local-chart"><LocalShareChart percentage={local.data.resumo.percentual_valor_vencido_me_local} size={260} />
                <p>{money(local.data.resumo.valor_vencido_me_local)} para ME locais de {money(local.data.resumo.valor_total_vencido)} no total · {percent(local.data.resumo.percentual_valor_vencido_me_local)}</p></div>
                : <DataState error={local.error} fallback="Selecione um município para consultar a participação local." />}
            </AnalysisChartCard>
          </div>

          <section className="analysis-table-card">
            <header><div><h2>Licitações detalhadas</h2><p>Registros retornados para os filtros aplicados; a API não informa se ainda estão abertos.</p></div><span>CNPJs mascarados</span></header>
            {rows.length ? <div className="analysis-table-scroll"><table>
              <thead><tr><th>Licitação</th><th>Empresa</th><th>CNPJ</th><th>Município</th><th>Natureza</th><th>Ano</th><th>Valor vencido</th></tr></thead>
              <tbody>{rows.map((bid, index) => <tr key={`${bid.codigo_municipio}-${bid.numero_licitacao}-${bid.cnpj}-${index}`}>
                <td><b>{bid.numero_licitacao}</b></td><td>{bid.empresa ?? "Não informada"}</td><td>{maskCnpj(bid.cnpj)}</td><td>{bid.municipio}</td><td>{bid.nome_natureza}</td><td>{bid.ano_licitacao}</td><td><strong>{money(bid.valor_total_vencido)}</strong></td>
              </tr>)}</tbody>
            </table></div> : <DataState error={bids.error} fallback="Nenhuma licitação encontrada para estes filtros." />}
            <div className="analysis-pagination">
              <span>Página {filters.page} · {rows.length} {rows.length === 1 ? "registro" : "registros"} exibidos</span>
              <form className="analysis-page-size" action="/analise" method="get">
                {filters.municipalityIbge && <input type="hidden" name="municipio" value={filters.municipalityIbge} />}
                {filters.natureCode && <input type="hidden" name="natureza" value={filters.natureCode} />}
                <input type="hidden" name="ano" value={filters.year} />
                <label htmlFor="analysis-page-size">Por página</label>
                <select id="analysis-page-size" name="limite" defaultValue={filters.pageSize}>
                  {[10, 20, 30].map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
                <button className="ds-button secondary" type="submit">Aplicar</button>
              </form>
              {filters.page > 1 && <Link className="ds-button secondary" href={pageLink(filters.page - 1)}>Anterior</Link>}
              {(bids.data?.data.length ?? 0) > filters.pageSize && <Link className="ds-button secondary" href={pageLink(filters.page + 1)}>Próxima</Link>}
            </div>
          </section>
          <p className="analysis-footnote"><Info /> O CSV exporta apenas os registros visíveis nesta página, com CNPJs mascarados.</p>
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
