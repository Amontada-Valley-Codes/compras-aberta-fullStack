"use client";

import "./municipality-detail.css";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { ApexOptions } from "apexcharts";
import { ArrowLeft, BarChart3, MapPin, Store, Table2, TrendingUp, Users } from "lucide-react";
import { formatCnpj } from "@/features/public-data/format";
import { PaymentShareChart, LocalPaymentShareChart } from "@/features/analysis/PaymentCharts";
import { PublicFilterSelect } from "@/components/filters/PublicFilterSelect";
import type { MunicipalityDetailData } from "./municipality-detail-data";
import { buildDetailNatureRows, buildDetailHistory, buildDetailSuppliers } from "./municipality-detail-model";
import { GESTOR_PUBLICO_NATURES, type NatureCode } from "./gestor-publico-data";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false, loading: () => <div className="md-chart-loading" role="status">Carregando gráfico…</div> });
const money = (value: number | null | undefined) => value == null ? "—" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const compactMoney = (value: number) => `R$ ${new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`;
const percent = (value: number | null | undefined) => value == null ? "—" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const share = (part: number | null, total: number | null) => part != null && total != null && total > 0 ? part / total * 100 : null;
const YEARS = [2026, 2025, 2024];
const HISTORY_YEARS = [...YEARS].sort((a, b) => a - b);

const chartBase: ApexOptions = {
  chart: { fontFamily: "inherit", toolbar: { show: false }, animations: { enabled: false }, zoom: { enabled: false } },
  colors: ["#11169b"],
  dataLabels: { enabled: false },
  grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
  stroke: { width: 0 },
  tooltip: { theme: "light", y: { formatter: money } },
  yaxis: { min: 0, tickAmount: 4, labels: { formatter: compactMoney, style: { colors: "#526477", fontSize: "11px" } } },
};

function Panel({ id, title, description, children, actions, className = "" }: { id: string; title: string; description: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return <section className={`md-panel ${className}`} aria-labelledby={id}><header className="md-panel-heading"><div><h2 id={id}>{title}</h2><p>{description}</p></div>{actions}</header>{children}</section>;
}

function ViewToggle({ table, setTable, label }: { table: boolean; setTable: (value: boolean) => void; label: string }) {
  return <div className="md-view-toggle" role="group" aria-label={`Visualização: ${label}`}>
    <button type="button" aria-label="Gráfico" title="Gráfico" aria-pressed={!table} onClick={() => setTable(false)}><BarChart3 size={17} /></button>
    <button type="button" aria-label="Tabela" title="Tabela" aria-pressed={table} onClick={() => setTable(true)}><Table2 size={17} /></button>
  </div>;
}

function Metric({ icon, label, value, detail, accent = false }: { icon: ReactNode; label: string; value: string; detail: string; accent?: boolean }) {
  return <article className={`md-metric${accent ? " md-metric-accent" : ""}`}><div className="md-metric-label"><span>{icon}</span><h2>{label}</h2></div><strong>{value}</strong><p>{detail}</p></article>;
}

export function MunicipalityDetailView({ data }: { data: MunicipalityDetailData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [natureTable, setNatureTable] = useState(false);
  const [historyTable, setHistoryTable] = useState(false);
  const [selectedNature, setSelectedNature] = useState<NatureCode>("39");
  const { analysis } = data;
  const { selectedMunicipality: municipality, payments } = analysis;
  const year = analysis.filters.year;
  if (!municipality) return <div className="gp-main gp-municipality-detail md-page"><Link className="md-back" href="/gestor/municipios"><ArrowLeft size={18} /> Voltar para municípios</Link><p role="status">Não foi possível identificar este município no catálogo da API.</p></div>;
  const summary = payments.data;
  const local = analysis.local;
  const suppliers = buildDetailSuppliers(data);
  const identifiedSuppliers = suppliers.filter((item) => item.identified).length;
  const supplierTotal = suppliers.reduce((sum, item) => sum + item.total, 0);
  const natures = buildDetailNatureRows(data);
  const total = summary ? Number(summary.total_controle) : null;
  const leadingNature = natures[0];
  const maxNature = Math.max(1, ...natures.map((item) => item.value));
  const paymentCount = summary?.data.reduce((sum, item) => sum + item.quantidade_pagamentos, 0);
  const history = buildDetailHistory(data, selectedNature);
  const historyFirst = history[0]?.value;
  const historyLast = history.at(-1)?.value;
  const historyVariation = historyFirst != null && historyFirst > 0 && historyLast != null ? (historyLast - historyFirst) / historyFirst * 100 : null;
  const selectedNatureName = GESTOR_PUBLICO_NATURES.find((item) => item.code === selectedNature)?.label ?? "";
  const historyOptions: ApexOptions = { ...chartBase, stroke: { curve: "straight", width: 2 }, markers: { size: 4, strokeWidth: 2 }, xaxis: { categories: HISTORY_YEARS.map(String), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: "#526477", fontSize: "11px" } }, tooltip: { enabled: false } } };
  return <div className="gp-main gp-municipality-detail md-page" aria-busy={isPending}>
    <Link className="md-back" href="/gestor/municipios"><ArrowLeft size={18} /> Voltar para municípios</Link>
    <header className="md-heading"><div><span className="md-eyebrow">MUNICÍPIO · CE</span><h1>{municipality.name}</h1><p>Pagamentos, microempresas e fornecedores · exercício {year}</p></div><div className="md-year"><PublicFilterSelect name="ano-municipio" label="Ano da análise" icon="year" variant="analysis" value={String(year)} options={YEARS.map((value) => ({ value: String(value), label: String(value) }))} onValueChange={(value) => startTransition(() => router.replace(`/gestor/municipios/${municipality.ibgeCode}?ano=${value}`, { scroll: false }))} /></div></header>
    {isPending && <p role="status">Consultando o ano selecionado…</p>}
    {payments.error && <p className="md-empty" role="status">{payments.error}</p>}
    <section className="md-metrics" aria-label={`Resumo de ${year}`}>
      <Metric icon={<BarChart3 size={21} />} label="Total pago" value={money(total)} detail={`Sete naturezas da despesa · exercício ${year}`} />
      <Metric icon={<TrendingUp size={21} />} label="Valor para ME" value={money(summary ? Number(summary.total_me) : null)} detail={`${percent(summary?.percentual_me)} do valor total pago`} accent />
      <Metric icon={<MapPin size={21} />} label="Compras locais" value={local.data?.percentage != null ? money(Number(local.data.localAmount)) : "—"} detail={local.error ?? "Pagamentos a ME sediadas no município, pelo cadastro atual de empresas"} />
      <Metric icon={<Users size={21} />} label="Fornecedores" value={data.suppliers.data ? identifiedSuppliers.toLocaleString("pt-BR") : "—"} detail={data.suppliers.error ?? "Documentos CPF/CNPJ identificados, sem duplicação entre naturezas"} />
    </section>
    <section className="md-reading" aria-label="Destaques do período"><div><span>Maior natureza da despesa</span><strong>{leadingNature?.label ?? "Sem dados na fonte"}</strong><p>{leadingNature ? `${percent(share(leadingNature.value, total))} do total · ${money(leadingNature.value)}` : "Sem pagamentos retornados para este exercício."}</p></div><div><span>Participação das ME</span><strong>{percent(summary?.percentual_me)}</strong><p>Parcela do total pago destinada a microempresas.</p></div><div><span>Pagamentos registrados</span><strong>{paymentCount?.toLocaleString("pt-BR") ?? "—"}</strong><p>Quantidade de pagamentos nas naturezas retornadas.</p></div></section>
    <div className="md-distribution-grid">
      <Panel id="md-nature-title" title="Compras por natureza da despesa" description={`Total pago a fornecedores de todos os portes, por natureza, no exercício ${year}.`} actions={<ViewToggle label="natureza da despesa" table={natureTable} setTable={setNatureTable} />}>
        {!natures.length ? <p className="md-empty" role="status">{payments.error ?? "A API não retornou pagamentos por natureza neste exercício."}</p> : natureTable ? <div className="md-table-scroll"><table className="md-table"><thead><tr><th scope="col">Natureza da despesa</th><th scope="col">Valor de compra</th><th scope="col">% do total pago</th></tr></thead><tbody>{natures.map((item) => <tr key={item.code}><th scope="row">{item.label}</th><td>{money(item.value)}</td><td>{percent(share(item.value, total))}</td></tr>)}</tbody></table></div> : <div className="md-nature-bars" role="list" aria-label="Valores por natureza da despesa">{natures.map((item, index) => <div className="md-nature-row" role="listitem" key={item.code}><div className="md-nature-name"><span className="md-rank">{index + 1}</span><span>{item.label}</span></div><div className="md-nature-amount"><strong>{money(item.value)}</strong><span>{percent(share(item.value, total))} do total</span></div><div className="md-track" aria-hidden="true"><i style={{ width: `${share(item.value, maxNature)}%` }} /></div></div>)}</div>}
        {summary && <><p className="md-footnote">{summary.observacao}</p><p className="md-footnote">Coleta {summary.coleta.coleta_id} · Referências {summary.coleta.referencia_pagamentos_inicio} a {summary.coleta.referencia_pagamentos_fim} · Conciliação: {summary.coleta.reconciliado == null ? "não informada" : summary.coleta.reconciliado ? "conciliada" : "não conciliada"} · {summary.pendencias.reduce((sum, row) => sum + row.quantidade, 0)} pendências.</p></>}
      </Panel>
      <Panel id="md-me-title" title="Participação das microempresas nas compras" description="Percentual do valor total pago destinado a ME, calculado pela API na mesma coleta.">
        <h3 className="md-share-title">Compras com ME em geral</h3>
        {summary?.percentual_me != null ? <><PaymentShareChart percentage={summary.percentual_me} size={180} /><p className="md-footnote">{money(Number(summary.total_me))} pagos a ME, de {money(total)} no total.</p></> : <p className="md-empty" role="status">{payments.error ?? "Sem base para calcular o percentual de pagamentos a ME."}</p>}
        <div className="md-local-share"><h3 className="md-share-title">Compras com ME locais</h3>{local.data?.percentage != null ? <><LocalPaymentShareChart percentage={local.data.percentage} size={180} /><p className="md-footnote">{money(Number(local.data.localAmount))} pagos a {local.data.localSuppliers} ME locais identificadas.</p></> : <p className="md-empty" role="status">{local.error ?? "Sem base para identificar as ME locais."}</p>}</div>
      </Panel>

    </div>
    <Panel id="md-history-title" title="Evolução histórica por natureza" description="Pagamentos por exercício orçamentário, incluindo pagamentos posteriores. Janelas e cobertura podem variar entre as coletas." actions={<ViewToggle label="evolução histórica" table={historyTable} setTable={setHistoryTable} />}>
      <div className="md-history-controls"><div className="md-history-select"><PublicFilterSelect name="historico-natureza" label="Natureza da despesa" icon="nature" variant="analysis" value={selectedNature} options={GESTOR_PUBLICO_NATURES.map((item) => ({ value: item.code, label: item.label }))} onValueChange={(value) => setSelectedNature(value as NatureCode)} /></div><div className="md-history-change"><span>Variação de {HISTORY_YEARS[0]} a {HISTORY_YEARS.at(-1)}</span><strong>{historyVariation == null ? "Sem base para comparação" : `${historyVariation > 0 ? "+" : ""}${percent(historyVariation)}`}</strong></div></div>
      <div className="md-year-values">{history.map((item) => <div key={item.year}><span>{item.year}</span><strong>{item.value == null ? "Indisponível" : money(item.value)}</strong></div>)}</div>
      {!history.some((item) => item.value != null) ? <p className="md-empty" role="status">A API não retornou pagamentos desta natureza nos anos consultados.</p> : historyTable ? <div className="md-table-scroll"><table className="md-table"><thead><tr><th scope="col">Ano</th><th scope="col">Natureza da despesa</th><th scope="col">Valor de compra</th></tr></thead><tbody>{history.map((item) => <tr key={item.year}><th scope="row">{item.year}</th><td>{selectedNatureName}</td><td>{item.value == null ? "Indisponível" : money(item.value)}</td></tr>)}</tbody></table></div> : <div className="md-history-chart" role="img" aria-label={`Evolução de ${selectedNatureName}. ${history.map((item) => `${item.year}: ${item.value == null ? "indisponível" : money(item.value)}`).join("; ")}`}><Chart type="line" height={260} options={historyOptions} series={[{ name: selectedNatureName, data: history.map((item) => item.value) }]} /></div>}
      {data.history.some((item) => item.payments.error) && <p className="md-footnote" role="status">Não foi possível carregar a coleta de um ou mais exercícios. Esses valores aparecem como indisponíveis.</p>}
    </Panel>
    <Panel id="md-supplier-title" title="Fornecedores contratados" description="Fornecedores de todos os portes, ordenados pelo total pago na mesma coleta do resumo.">
      {data.suppliers.error || !suppliers.length ? <p className="md-empty" role="status">{data.suppliers.error ?? "Nenhum fornecedor retornado neste ano."}</p> : <div className="md-table-scroll"><table className="md-table md-supplier-table"><thead><tr><th scope="col">Fornecedor</th><th scope="col">Categoria de porte</th><th scope="col">Pagamentos</th><th scope="col">Valor de compra</th><th scope="col">% do total listado</th></tr></thead><tbody>{suppliers.map((supplier, index) => <tr key={supplier.id}><th scope="row"><span className="md-supplier-name"><span className="md-rank">{index + 1}</span><span>{supplier.name}<small>{formatCnpj(supplier.document)}</small></span></span></th><td><span className="md-size-badge">{supplier.size}</span></td><td>{supplier.payments}</td><td><strong>{money(supplier.total)}</strong></td><td>{percent(share(supplier.total, supplierTotal))}</td></tr>)}</tbody></table></div>}
      <p className="md-footnote">Documentos ausentes ou inválidos podem participar dos totais e não contam como fornecedores identificados.</p>
    </Panel>
    <div className="md-distribution-grid"><Panel id="md-origin-title" title="Pagamentos locais a ME" description="Valores e fornecedores identificados pela consulta de ME locais da API.">
      {local.data ? <div className="md-origin-list"><div className="md-origin"><div><h3>No município</h3><strong>{percent(local.data.percentage)}</strong></div><p><b>{money(Number(local.data.localAmount))}</b><span>{local.data.localSuppliers} ME · {local.data.localPaymentCount} pagamentos</span></p></div></div> : <p className="md-empty" role="status">{local.error ?? "Não foi possível consultar os pagamentos locais a ME."}</p>}
      <p className="md-footnote">A API fornece o subtotal local; não disponibiliza separadamente valores de fornecedores externos ou com sede não identificada.</p>
    </Panel><Panel id="md-month-title" title="Evolução mensal" description="Disponibilidade da série de pagamentos por mês."><p className="md-empty" role="status">Série mensal indisponível na API. O total anual não é distribuído entre meses.</p></Panel></div>
    <footer className="md-information" aria-label="Informações do município"><div><Store size={20} /><strong>{municipality.name}/CE</strong></div><dl><div><dt>Código IBGE</dt><dd>{municipality.ibgeCode}</dd></div><div><dt>Código TCE</dt><dd>{municipality.tceCode}</dd></div><div><dt>Exercício</dt><dd>{year}</dd></div><div><dt>Fonte da informação</dt><dd>Pagamentos · API Compras Abertas</dd></div></dl></footer>
  </div>;
}
