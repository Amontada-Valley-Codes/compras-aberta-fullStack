"use client";

import "./municipality-detail.css";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ApexOptions } from "apexcharts";
import { ArrowLeft, CircleDollarSign, MapPinned, Percent, Receipt, Shapes, Store, Users } from "lucide-react";
import { formatCnpj } from "@/features/public-data/format";
import { PaymentShareChart, LocalPaymentShareChart } from "@/features/analysis/PaymentCharts";
import { PublicFilterSelect } from "@/components/filters/PublicFilterSelect";
import { PublicTable, PublicTablePagination } from "@/components/filters/PublicTable";
import type { MunicipalityDetailData } from "./municipality-detail-data";
import { buildDetailNatureRows, buildDetailHistory, buildDetailSuppliers } from "./municipality-detail-model";
import { GESTOR_PUBLICO_NATURES, type NatureCode } from "./gestor-publico-data";
import { AnalysisCard, Card, ChartViewControls, EmptyState, PageHeader, PublicKpi, SourceNote } from "./GestorPublicoUI";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false, loading: () => <div className="md-chart-loading" role="status">Carregando gráfico…</div> });
const money = (value: number | null | undefined) => value == null ? "—" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const compactMoney = (value: number) => `R$ ${new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`;
const percent = (value: number | null | undefined) => value == null ? "—" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const count = (value: number) => value.toLocaleString("pt-BR");
const share = (part: number | null, total: number | null) => part != null && total != null && total > 0 ? part / total * 100 : null;
const YEARS = [2026, 2025, 2024];
const HISTORY_YEARS = [...YEARS].sort((a, b) => a - b);
const MPE_SIZES = /^(ME|EPP|MEI|MPE)$/i;

const chartBase: ApexOptions = {
  chart: { fontFamily: "inherit", toolbar: { show: false }, animations: { enabled: false }, zoom: { enabled: false } },
  colors: ["#11169b"],
  dataLabels: { enabled: false },
  grid: { borderColor: "#dce6ec", strokeDashArray: 4 },
  stroke: { width: 0 },
  tooltip: { theme: "light", y: { formatter: money } },
  yaxis: { min: 0, tickAmount: 4, labels: { formatter: compactMoney, style: { colors: "#5b6b77", fontSize: "11px" } } },
};

export function MunicipalityDetailView({ data }: { data: MunicipalityDetailData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [natureTable, setNatureTable] = useState(false);
  const [historyTable, setHistoryTable] = useState(false);
  const [selectedNature, setSelectedNature] = useState<NatureCode>("39");
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierPageSize, setSupplierPageSize] = useState(10);
  const { analysis } = data;
  const { selectedMunicipality: municipality, payments } = analysis;
  const year = analysis.filters.year;
  const back = <Link className="gp-back-link md-back" href="/gestor/municipios"><ArrowLeft size={16} aria-hidden="true" /> Voltar para municípios</Link>;

  if (!municipality) return <div className="gp-main md-page">{back}<EmptyState>Não foi possível identificar este município no catálogo da API.</EmptyState></div>;

  const summary = payments.data;
  const local = analysis.local;
  const suppliers = buildDetailSuppliers(data);
  const identifiedSuppliers = suppliers.filter((item) => item.identified).length;
  const supplierTotal = suppliers.reduce((sum, item) => sum + item.total, 0);
  const supplierPageCount = Math.max(1, Math.ceil(suppliers.length / supplierPageSize));
  const currentSupplierPage = Math.min(supplierPage, supplierPageCount);
  const supplierOffset = (currentSupplierPage - 1) * supplierPageSize;
  const pageSuppliers = suppliers.slice(supplierOffset, supplierOffset + supplierPageSize);
  const natures = buildDetailNatureRows(data);
  const total = summary ? Number(summary.total_controle) : null;
  const leadingNature = natures[0];
  const maxNature = Math.max(1, ...natures.map((item) => item.value));
  const paymentCount = summary?.data.reduce((sum, item) => sum + item.quantidade_pagamentos, 0);
  const pendingCount = summary?.pendencias.reduce((sum, row) => sum + row.quantidade, 0) ?? 0;
  const history = buildDetailHistory(data, selectedNature);
  const historyFirst = history[0]?.value;
  const historyLast = history.at(-1)?.value;
  const historyVariation = historyFirst != null && historyFirst > 0 && historyLast != null ? (historyLast - historyFirst) / historyFirst * 100 : null;
  const selectedNatureName = GESTOR_PUBLICO_NATURES.find((item) => item.code === selectedNature)?.label ?? "";
  const historyOptions: ApexOptions = { ...chartBase, stroke: { curve: "straight", width: 2 }, markers: { size: 4, strokeWidth: 2 }, xaxis: { categories: HISTORY_YEARS.map(String), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: "#5b6b77", fontSize: "11px" } }, tooltip: { enabled: false } } };
  const changeYear = (value: string) => startTransition(() => router.replace(`/gestor/municipios/${municipality.ibgeCode}?ano=${value}`, { scroll: false }));
  const changeSupplierPage = (next: number) => {
    setSupplierPage(Math.max(1, Math.min(next, supplierPageCount)));
    document.getElementById("md-suppliers")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return <div className="gp-main md-page" aria-busy={isPending}>
    {back}
    <PageHeader
      eyebrow="Município · Ceará"
      title={municipality.name}
      description={`Pagamentos, participação de microempresas e fornecedores no exercício ${year}.`}
      actions={<div className="analysis-filter-fields md-year-filter"><PublicFilterSelect name="ano-municipio" label="Ano da análise" icon="year" variant="analysis" value={String(year)} options={YEARS.map((value) => ({ value: String(value), label: String(value) }))} onValueChange={changeYear} /></div>}
    />

    <div className="gp-filter-summary">
      <span>Código IBGE {municipality.ibgeCode}</span>
      <span>Código TCE {municipality.tceCode}</span>
      <span>Exercício {year}</span>
      {isPending && <span role="status">Consultando o ano selecionado…</span>}
    </div>

    {payments.error && <EmptyState>{payments.error}</EmptyState>}

    <section className="analysis-kpis gp-kpis-4"aria-label={`Resumo de ${year}`}>
      <PublicKpi icon={<CircleDollarSign />} label="Quanto foi pago no total?" value={money(total)} detail={`${count(natures.length)} naturezas da despesa no exercício ${year}`} />
      <PublicKpi icon={<Store />} label="Quanto foi pago a ME?" value={money(summary ? Number(summary.total_me) : null)} detail={`${percent(summary?.percentual_me)} do valor total pago`} accent />
      <PublicKpi icon={<MapPinned />} label="Quanto foi pago a ME locais?" value={local.data?.percentage != null ? money(Number(local.data.localAmount)) : "—"} detail={local.error ?? `${percent(local.data?.percentage)} do total, a ME sediadas no município`} />
      <PublicKpi icon={<Users />} label="Quantos fornecedores receberam?" value={data.suppliers.data ? count(identifiedSuppliers) : "—"} detail={data.suppliers.error ?? "CPF/CNPJ identificados, sem duplicação entre naturezas"} />
    </section>

    <section className="analysis-kpis md-highlights" aria-label="Destaques do período">
      <PublicKpi className="md-kpi-text" icon={<Shapes />} label="Qual natureza teve o maior valor pago?" value={leadingNature?.label ?? "Sem dados na fonte"} detail={leadingNature ? `${percent(share(leadingNature.value, total))} do total · ${money(leadingNature.value)}` : "Sem pagamentos retornados para este exercício."} />
      <PublicKpi icon={<Percent />} label="Qual a participação das ME?" value={percent(summary?.percentual_me)} detail="Parcela do total pago destinada a microempresas." accent />
      <PublicKpi icon={<Receipt />} label="Quantos pagamentos foram registrados?" value={paymentCount != null ? count(paymentCount) : "—"} detail="Quantidade de pagamentos nas naturezas retornadas." />
    </section>

    <div className="analysis-chart-grid gp-analysis-chart-grid md-grid">
      <AnalysisCard title="Quanto foi pago em cada natureza?" description={`Total pago a fornecedores de todos os portes no exercício ${year}.`} actions={natures.length ? <ChartViewControls label="natureza da despesa" table={natureTable} onTableChange={setNatureTable} /> : undefined}>
        {!natures.length ? <EmptyState>{payments.error ?? "A API não retornou pagamentos por natureza neste exercício."}</EmptyState> : natureTable
          ? <div className="analysis-chart-table-wrap"><table className="analysis-chart-table"><thead><tr><th scope="col">Natureza da despesa</th><th scope="col">Valor pago</th><th scope="col">% do total</th></tr></thead><tbody>{natures.map((item) => <tr key={item.code}><td>{item.label}</td><td>{money(item.value)}</td><td>{percent(share(item.value, total))}</td></tr>)}</tbody></table></div>
          : <ol className="md-nature-bars" aria-label="Valores por natureza da despesa">{natures.map((item, index) => <li key={item.code}>
              <span className="md-rank">{String(index + 1).padStart(2, "0")}</span>
              <span className="md-nature-name">{item.label}</span>
              <span className="md-nature-amount"><strong>{money(item.value)}</strong><small>{percent(share(item.value, total))} do total</small></span>
              <span className="md-track" aria-hidden="true"><i style={{ width: `${share(item.value, maxNature)}%` }} /></span>
            </li>)}</ol>}
        {summary && <SourceNote>{summary.observacao} Coleta {summary.coleta.coleta_id} · referências {summary.coleta.referencia_pagamentos_inicio} a {summary.coleta.referencia_pagamentos_fim} · {summary.coleta.reconciliado == null ? "conciliação não informada" : summary.coleta.reconciliado ? "conciliada" : "não conciliada"} · {count(pendingCount)} pendências.</SourceNote>}
      </AnalysisCard>

      <AnalysisCard className="md-share-card" title="Quanto das compras foi para ME?"description="Compare o total pago a ME com a parcela identificada como local.">
        <div className="analysis-share-comparison md-share-comparison">
          <div className="analysis-share-item"><h3>Quanto foi pago a ME em geral?</h3>{summary?.percentual_me != null ? <><PaymentShareChart percentage={summary.percentual_me} size={170} /><p>{money(Number(summary.total_me))} pagos a ME, de {money(total)}</p></> : <EmptyState>{payments.error ?? "Sem base para calcular o percentual de pagamentos a ME."}</EmptyState>}</div>
          <div className="analysis-share-item"><h3>Quanto foi pago a ME locais?</h3>{local.data?.percentage != null ? <><LocalPaymentShareChart percentage={local.data.percentage} size={170} /><p>{money(Number(local.data.localAmount))} pagos a {count(local.data.localSuppliers)} ME locais</p></> : <EmptyState>{local.error ?? "Sem base para identificar as ME locais."}</EmptyState>}</div>
        </div>
      </AnalysisCard>
    </div>

    <AnalysisCard className="md-history-card" title="Como os pagamentos evoluíram ao longo dos anos?" description="Pagamentos por exercício orçamentário, incluindo pagamentos posteriores. Janelas e cobertura podem variar entre as coletas." actions={<ChartViewControls label="evolução histórica" table={historyTable} onTableChange={setHistoryTable} />}>
      <div className="md-history-toolbar">
        <div className="analysis-filter-fields md-nature-filter"><PublicFilterSelect name="historico-natureza" label="Natureza da despesa" icon="nature" variant="analysis" value={selectedNature} options={GESTOR_PUBLICO_NATURES.map((item) => ({ value: item.code, label: item.label }))} onValueChange={(value) => setSelectedNature(value as NatureCode)} /></div>
        <dl className="md-year-values">
          {history.map((item) => <div key={item.year}><dt>{item.year}</dt><dd>{item.value == null ? "Indisponível" : money(item.value)}</dd></div>)}
          <div className="md-variation"><dt>Variação {HISTORY_YEARS[0]}–{HISTORY_YEARS.at(-1)}</dt><dd>{historyVariation == null ? "Sem base" : `${historyVariation > 0 ? "+" : ""}${percent(historyVariation)}`}</dd></div>
        </dl>
      </div>
      {!history.some((item) => item.value != null) ? <EmptyState>A API não retornou pagamentos desta natureza nos anos consultados.</EmptyState> : historyTable
        ? <div className="analysis-chart-table-wrap"><table className="analysis-chart-table"><thead><tr><th scope="col">Ano</th><th scope="col">Natureza da despesa</th><th scope="col">Valor pago</th></tr></thead><tbody>{history.map((item) => <tr key={item.year}><td>{item.year}</td><td>{selectedNatureName}</td><td>{item.value == null ? "Indisponível" : money(item.value)}</td></tr>)}</tbody></table></div>
        : <div className="md-history-chart" role="img" aria-label={`Evolução de ${selectedNatureName}. ${history.map((item) => `${item.year}: ${item.value == null ? "indisponível" : money(item.value)}`).join("; ")}`}><Chart type="line" height={260} options={historyOptions} series={[{ name: selectedNatureName, data: history.map((item) => item.value) }]} /></div>}
      {data.history.some((item) => item.payments.error) && <SourceNote>Não foi possível carregar a coleta de um ou mais exercícios. Esses valores aparecem como indisponíveis.</SourceNote>}
    </AnalysisCard>

    <div id="md-suppliers">
      <Card className="gp-list-card md-suppliers-card" title={data.suppliers.data ? `${count(suppliers.length)} fornecedores contratados` : "Fornecedores contratados"} description={suppliers.length ? `Juntos, receberam ${money(supplierTotal)} em ${year}. Fornecedores de todos os portes, ordenados pelo total pago.` : "Fornecedores de todos os portes, ordenados pelo total pago."}>
        {data.suppliers.error || !suppliers.length ? <EmptyState>{data.suppliers.error ?? "Nenhum fornecedor retornado neste ano."}</EmptyState> : <>
          <div className="gp-table-wrap">
            <PublicTable className="md-supplier-table">
              <caption className="gp-sr-only">Fornecedores contratados por {municipality.name} em {year}</caption>
              <thead><tr><th scope="col">Fornecedor</th><th scope="col">Porte</th><th scope="col">Pagamentos</th><th scope="col">Valor pago</th><th scope="col">% do total</th></tr></thead>
              <tbody>{pageSuppliers.map((supplier, index) => <tr key={supplier.id}>
                <th scope="row"><span className="md-supplier-name"><span className="md-rank">{String(supplierOffset + index + 1).padStart(2, "0")}</span><span>{supplier.name}<small>{formatCnpj(supplier.document)}</small></span></span></th>
                <td><span className={`gp-tag ${MPE_SIZES.test(supplier.size) ? "is-mpe" : "is-neutral"}`}>{supplier.size}</span></td>
                <td>{count(supplier.payments)}</td>
                <td><strong>{money(supplier.total)}</strong></td>
                <td>{percent(share(supplier.total, supplierTotal))}</td>
              </tr>)}</tbody>
            </PublicTable>
          </div>
          <PublicTablePagination page={currentSupplierPage} pageSize={supplierPageSize} total={suppliers.length} onPageChange={changeSupplierPage} onPageSizeChange={(size) => { setSupplierPageSize(size); setSupplierPage(1); }} label="Paginação dos fornecedores" />
        </>}
        <SourceNote>Documentos ausentes ou inválidos podem participar dos totais e não contam como fornecedores identificados.</SourceNote>
      </Card>
    </div>

    <div className="gp-grid gp-grid-2 md-secondary-grid">
      <Card title="Quanto foi pago a ME locais?" description="Valores e fornecedores identificados pela consulta de ME locais da API.">
        {local.data ? <dl className="gp-overview-summary">
          <div><dt>Participação no total pago</dt><dd>{percent(local.data.percentage)}</dd></div>
          <div><dt>Valor pago a ME do município</dt><dd>{money(Number(local.data.localAmount))}</dd></div>
          <div><dt>ME locais e pagamentos</dt><dd>{count(local.data.localSuppliers)} ME · {count(local.data.localPaymentCount)} pagamentos</dd></div>
        </dl> : <EmptyState>{local.error ?? "Não foi possível consultar os pagamentos locais a ME."}</EmptyState>}
        <SourceNote>A API fornece o subtotal local; não disponibiliza separadamente valores de fornecedores externos ou com sede não identificada.</SourceNote>
      </Card>
      <Card title="Como os pagamentos se distribuem ao longo do ano?" description="Disponibilidade da série de pagamentos por mês.">
        <EmptyState>Série mensal indisponível na API. O total anual não é distribuído entre meses.</EmptyState>
      </Card>
    </div>

    <SourceNote>Fonte: pagamentos da API Compras Abertas · {municipality.name}/CE · exercício {year}.</SourceNote>
  </div>;
}
