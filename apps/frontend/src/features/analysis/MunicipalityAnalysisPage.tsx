import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, CircleDollarSign, Search, SearchX, Store, MapPinned } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PublicFilterSelect } from "@/components/filters/PublicFilterSelect";
import { PublicTable } from "@/components/filters/PublicTable";
import { PaymentNatureChart, PaymentShareChart, LocalPaymentShareChart } from "./PaymentCharts";
import { selectPaymentNatures, selectPaymentTotals } from "./payment-selectors";
import { compactMoney, count, money, percent } from "@/features/public-data/format";
import type { AnalysisData } from "@/features/public-data/public-data";
import { AnalysisPagination } from "./AnalysisPagination";
import { AnalysisPaymentsTable } from "./AnalysisPaymentsTable";

export function MunicipalityAnalysisPage({ data }: { data: AnalysisData }) {
  const { filters, selectedMunicipality, municipalities, payments, suppliers, local, allMunicipalities } = data;
  const municipalityName = selectedMunicipality?.name ?? "";
  const natures = selectPaymentNatures(payments.data, filters.natureCode);
  const totals = selectPaymentTotals(payments.data, filters.natureCode);
  const rows = suppliers.data?.data ?? [];
  return <div className="analysis-page">
    <header className="analysis-header"><div className="analysis-container"><BrandLogo /><nav><Link href="/empresa">Área da empresa</Link></nav></div></header>
    <main className="analysis-container analysis-main">
      <Link className="analysis-back" href="/"><ArrowLeft /> Voltar para a página inicial</Link>
      <section className="analysis-title-row"><div><h1>Compras e microempresas{municipalityName ? ` em ${municipalityName}` : allMunicipalities ? " nos municípios do Ceará" : ""}</h1><p>Valores efetivamente pagos, por natureza da despesa e participação de microempresas.</p></div></section>
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

      {!selectedMunicipality && !allMunicipalities ? <DataState error={payments.error} fallback="Não foi possível consultar os pagamentos municipais." /> : <section className="analysis-results">
        {payments.error && <DataState error={payments.error} />}
        {allMunicipalities && <p className="analysis-data-state" role="status">Dados de {count(allMunicipalities.rows.length)} de {count(allMunicipalities.requested)} municípios consultados. Os totais reúnem as coletas municipais do ano selecionado.</p>}
        <div className="analysis-kpis">
          <AnalysisKpi icon={<CircleDollarSign />} label="Total de compras" value={compactMoney(totals.total)} fullValue={money(totals.total)} detail={`${count(totals.payments)} pagamentos realizados no recorte selecionado.`} />
          <AnalysisKpi icon={<Store />} label="Compras com ME" value={compactMoney(totals.me)} fullValue={money(totals.me)} detail={allMunicipalities ? `${percent(totals.percentage)} do total.` : `${percent(totals.percentage)} do total · ${count(local.data?.mePayments)} pagamentos a ME.`} accent />
          <AnalysisKpi icon={<MapPinned />} label="Compras com ME locais" value={local.data?.percentage != null ? compactMoney(local.data.localAmount) : "—"} fullValue={local.data?.percentage != null ? money(local.data.localAmount) : "—"} detail={local.error ?? `${percent(local.data?.percentage)} do total.`} />
        </div>
        {local.error && <DataState error={`Recorte de ME locais: ${local.error}`} />}
        <div className="analysis-chart-grid">
          <AnalysisChartCard title="Quanto foi pago a ME em cada natureza" description="Valor pago a microempresas, separado por natureza da despesa." tone="navy">
            {natures.length ? <PaymentNatureChart data={natures} metric="valor_me" /> : <DataState error={payments.error} />}
          </AnalysisChartCard>
          <AnalysisChartCard title="Participação das microempresas nas compras" description="Parcela dos pagamentos destinada a ME, sobre o total de controle da mesma coleta." tone="teal">
            <div className="analysis-share-comparison"><div className="analysis-share-item"><h3>Compras com ME locais</h3>{local.data?.percentage != null ? <><LocalPaymentShareChart percentage={local.data.percentage} /><p>{money(local.data.localAmount)} pagos a ME locais identificadas</p></> : <DataState error={local.error} fallback="Sem base para identificar a sede das ME ou calcular o percentual local." />}</div><div className="analysis-share-item"><h3>Compras com ME em geral</h3>{totals.percentage != null ? <><PaymentShareChart percentage={totals.percentage} /><p>{money(totals.me)} pagos a ME</p></> : <DataState error={payments.error} fallback="Sem base para calcular o percentual de pagamentos." />}</div></div>
          </AnalysisChartCard>
          <AnalysisChartCard title="Quanto foi pago no total em cada natureza" description="Valor pago a fornecedores de todos os portes, separado por natureza da despesa." tone="blue">
            {natures.length ? <PaymentNatureChart data={natures} metric="total_controle" /> : <DataState error={payments.error} />}
          </AnalysisChartCard>
          <AnalysisChartCard title="Qual parte do total foi paga a ME em cada natureza" description="Percentual do valor total de cada natureza que foi pago a microempresas." tone="gold">
            {natures.length ? <PaymentNatureChart data={natures} metric="percentual_me" /> : <DataState error={payments.error} />}
          </AnalysisChartCard>
        </div>
        {allMunicipalities ? <section className="analysis-table-card" id="municipios">
          <header><div><h2>Pagamentos por município</h2><p>Selecione um município para ver os fornecedores e os pagamentos individuais.</p></div></header>
          <div className="analysis-table-scroll"><PublicTable><thead><tr><th>Município</th><th>Total pago</th><th>Pago a ME</th><th>Participação de ME</th><th>Pago a ME locais</th></tr></thead><tbody>{allMunicipalities.rows.map((row) => <tr key={row.municipality.ibgeCode}><td><Link href={`/analise?municipio=${row.municipality.ibgeCode}&ano=${filters.year}${filters.natureCode ? `&natureza=${filters.natureCode}` : ""}`}>{row.municipality.name}</Link></td><td>{money(row.total)}</td><td>{money(row.me)}</td><td>{percent(Number(row.total) > 0 ? Number(row.me) / Number(row.total) * 100 : null)}</td><td>{row.local == null ? "—" : money(row.local)}</td></tr>)}</tbody></PublicTable></div>
        </section> : <section className="analysis-table-card" id="fornecedores">
          <header><div><h2>Pagamentos a microempresas</h2><p>Total pago por microempresa em cada natureza da despesa, na mesma coleta dos gráficos.</p></div></header>
          {rows.length ? <AnalysisPaymentsTable rows={rows} /> : <DataState error={suppliers.error} fallback="Nenhum pagamento a ME encontrado para estes filtros." />}
          {data.paginationError && <DataState error={data.paginationError} fallback="Não foi possível verificar a próxima página." />}
          <AnalysisPagination filters={filters} rowCount={rows.length} hasNext={data.hasNext} />
        </section>}
      </section>}
    </main>
  </div>;
}

function AnalysisKpi({ icon, label, value, fullValue, detail, accent }: { icon: ReactNode; label: string; value: string; fullValue: string; detail: string; accent?: boolean }) {
  return <article className={accent ? "accent" : ""}><div><span>{icon}</span><small>{label}</small></div><strong title={fullValue} aria-label={fullValue}>{value}</strong><p>{detail}</p></article>;
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

function DataState({ error, fallback = "Sem dados para os filtros selecionados.", title = "Nenhum dado encontrado" }: { error: string | null; fallback?: string; title?: string }) {
  const message = error ?? fallback;
  return <div className="analysis-data-state" role="status">
    <SearchX aria-hidden="true" />
    <strong>{error ? "Não foi possível carregar estes dados" : title}</strong>
    <span>{message}</span>
  </div>;
}
