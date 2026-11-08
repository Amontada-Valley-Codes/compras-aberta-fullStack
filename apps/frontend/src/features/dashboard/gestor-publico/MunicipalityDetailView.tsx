"use client";

import "./municipality-detail.css";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { ApexOptions } from "apexcharts";
import { ArrowLeft, BarChart3, Info, MapPin, Store, Table2, TrendingUp, Users } from "lucide-react";
import { PublicFilterSelect } from "@/components/filters/PublicFilterSelect";
import type { MunicipalityDetailData } from "./municipality-detail-data";
import { buildDetailNatureRows, buildDetailHistory, buildDetailWinners, type NatureMetric } from "./municipality-detail-model";
import { GESTOR_PUBLICO_NATURES, type NatureCode } from "./gestor-publico-data";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false, loading: () => <div className="md-chart-loading" role="status">Carregando gráfico…</div> });
const money = (value: number | null | undefined) => value == null ? "—" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const compactMoney = (value: number) => `R$ ${new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`;
const percent = (value: number | null | undefined) => value == null ? "—" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const share = (part: number | null, total: number | null) => part != null && total != null && total > 0 ? part / total * 100 : null;
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const YEARS = [2026, 2025, 2024];
const HISTORY_YEARS = [...YEARS].sort((a, b) => a - b);

const chartBase: ApexOptions = {
  chart: { fontFamily: "inherit", toolbar: { show: false }, animations: { enabled: false }, zoom: { enabled: false } },
  colors: ["#11169b"],
  dataLabels: { enabled: false },
  grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
  stroke: { width: 0 },
  tooltip: { theme: "light", y: { formatter: money } },
  yaxis: { min: 0, tickAmount: 4, labels: { formatter: compactMoney, style: { colors: "#526477", fontSize: "14px" } } },
};

function Panel({ id, title, description, children, actions, className = "" }: { id: string; title: string; description: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return <section className={`md-panel ${className}`} aria-labelledby={id}><header className="md-panel-heading"><div><h2 id={id}>{title}</h2><p>{description}</p></div>{actions}</header>{children}</section>;
}

function ViewToggle({ table, setTable, label }: { table: boolean; setTable: (value: boolean) => void; label: string }) {
  return <div className="md-view-toggle" role="group" aria-label={`Visualização: ${label}`}>
    <button type="button" aria-pressed={!table} onClick={() => setTable(false)}><BarChart3 size={17} /> Gráfico</button>
    <button type="button" aria-pressed={table} onClick={() => setTable(true)}><Table2 size={17} /> Tabela</button>
  </div>;
}

function Metric({ icon, label, value, detail, accent = false }: { icon: ReactNode; label: string; value: string; detail: string; accent?: boolean }) {
  return <article className={`md-metric${accent ? " md-metric-accent" : ""}`}><div className="md-metric-label"><span>{icon}</span><h2>{label}</h2></div><strong>{value}</strong><p>{detail}</p></article>;
}

export function MunicipalityDetailView({ data }: { data: MunicipalityDetailData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [metric, setMetric] = useState<NatureMetric>("dotacoes");
  const [monthlyTable, setMonthlyTable] = useState(false);
  const [natureTable, setNatureTable] = useState(false);
  const [historyTable, setHistoryTable] = useState(false);
  const [selectedNature, setSelectedNature] = useState<NatureCode>("39");
  const { analysis } = data;
  const { selectedMunicipality: municipality } = analysis;
  const year = analysis.filters.year;
  if (!municipality) return <div className="gp-main gp-municipality-detail md-page"><Link className="md-back" href="/gestor/municipios"><ArrowLeft size={18} /> Voltar para municípios</Link><p role="status">Não foi possível identificar este município no catálogo da API. Tente novamente.</p></div>;
  const general = analysis.general.data?.resumo;
  const local = analysis.local.data?.resumo;
  const currentSource = data.history.find((item) => item.year === year);
  const metricError = metric === "dotacoes" ? currentSource?.expenses.error : currentSource?.payments.error;
  const summary = {
    name: municipality.name, id: municipality.ibgeCode, tceCode: municipality.tceCode,
    total: general ? Number(general.valor_total_vencido) : null,
    mpeValue: general ? Number(general.valor_vencido_me) : null,
    mpePercent: general?.percentual_valor_vencido_me ?? null,
    localValue: local ? Number(local.valor_vencido_me_local) : null,
    localPercent: local?.percentual_valor_vencido_me_local ?? null,
    suppliers: analysis.micro.data?.data.quantidade_microempresas ?? null,
  };
  const { suppliers, monthly, undatedValue } = buildDetailWinners(data);
  const supplierTotal = suppliers.reduce((total, item) => total + item.total, 0);
  const natures = buildDetailNatureRows(data, metric);
  const natureTotal = natures.reduce((total, item) => total + item.value, 0);
  const leadingNature = natures[0];
  const maxNature = Math.max(1, ...natures.map((item) => item.value));
  const monthlyTotal = monthly.reduce((total, value) => total + value, 0);
  const peakMonth = monthly.indexOf(Math.max(...monthly));
  const history = buildDetailHistory(data, metric, selectedNature);
  const historyFirst = history[0]?.value;
  const historyLast = history.at(-1)?.value;
  const historyVariation = historyFirst != null && historyFirst > 0 && historyLast != null ? (historyLast - historyFirst) / historyFirst * 100 : null;
  const selectedNatureName = GESTOR_PUBLICO_NATURES.find((item) => item.code === selectedNature)?.label ?? "";
  const origins = (data.winners.data?.length ? ["Local", "Outro município do CE", "Outro estado", "Não informada"] : []).map((origin) => {
    const rows = suppliers.filter((supplier) => supplier.origin === origin);
    const value = rows.reduce((total, supplier) => total + supplier.total, 0);
    return { origin, value, count: rows.length, percentage: share(value, supplierTotal) };
  });
  const natureMetricLabel = metric === "dotacoes" ? "Dotações associadas às licitações" : "Pagamentos efetivos";
  const sourceObservation = metric === "dotacoes" ? currentSource?.expenses.data?.observacao : currentSource?.payments.data?.observacao;
  const monthlyOptions: ApexOptions = {
    ...chartBase,
    plotOptions: { bar: { borderRadius: 5, columnWidth: "48%", dataLabels: { position: "top" } } },
    xaxis: { categories: MONTHS, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: "#526477", fontSize: "14px" } } },
    tooltip: { x: { formatter: (_value, options) => `${MONTHS[options?.dataPointIndex ?? 0]} de ${year}` }, y: { formatter: money } },
    dataLabels: { enabled: true, offsetY: -18, formatter: compactMoney, style: { colors: ["#334155"], fontSize: "13px", fontWeight: 600 }, background: { enabled: false } },
    grid: { ...chartBase.grid, padding: { top: 24 } },
  };
  const historyOptions: ApexOptions = {
    ...chartBase,
    stroke: { curve: "straight", width: 3 },
    markers: { size: 6, strokeWidth: 3, hover: { size: 8 } },
    fill: { type: "gradient", gradient: { opacityFrom: 0.2, opacityTo: 0.02 } },
    xaxis: { categories: HISTORY_YEARS.map(String), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: "#526477", fontSize: "15px" } }, tooltip: { enabled: false } },
  };

  return <div className="gp-main gp-municipality-detail md-page" aria-busy={isPending}>
    <Link className="md-back" href="/gestor/municipios"><ArrowLeft size={18} /> Voltar para municípios</Link>
    <header className="md-heading"><div><span className="md-eyebrow">VISÃO DETALHADA DO MUNICÍPIO</span><h1>{summary.name}</h1><p>Compras públicas, participação das ME e distribuição dos fornecedores.</p></div><div className="md-year"><PublicFilterSelect name="ano-municipio" label="Ano da análise" icon="year" variant="analysis" value={String(year)} options={YEARS.map((value) => ({ value: String(value), label: String(value) }))} onValueChange={(value) => startTransition(() => router.replace(`/gestor/municipios/${municipality.ibgeCode}?ano=${value}`, { scroll: false }))} /></div></header>
    <div className="md-source-banner" role="note"><Info size={20} /><p><strong>Dados da API Compras Abertas / TCE-CE.</strong> Indicadores e fornecedores mostram valores vencidos por ME em licitações. O gráfico por natureza identifica separadamente dotações e pagamentos.</p></div>

    {isPending && <p role="status">Consultando o ano selecionado…</p>}
    {analysis.general.error && <p className="md-source-banner" role="status">{analysis.general.error}</p>}
    <section className="md-metrics" aria-label={`Resumo de ${year}`}>
      <Metric icon={<BarChart3 size={21} />} label="Compras analisadas" value={money(summary.total)} detail={`Valor vencido por empresas identificadas, de todos os portes · ${year}`} />
      <Metric icon={<TrendingUp size={21} />} label="Valor para ME" value={money(summary.mpeValue)} detail={`${percent(summary.mpePercent)} do valor total das compras`} accent />
      <Metric icon={<MapPin size={21} />} label="Compras locais" value={money(summary.localValue)} detail={analysis.local.error ?? `${percent(summary.localPercent)} do total, com ME sediadas no município`} />
      <Metric icon={<Users size={21} />} label="Fornecedores" value={summary.suppliers?.toLocaleString("pt-BR") ?? "—"} detail={analysis.micro.error ?? "Microempresas vencedoras identificadas"} />
    </section>

    <section className="md-reading" aria-label="Destaques do período"><div><span>Maior natureza da despesa</span><strong>{leadingNature?.label ?? "Sem dados na fonte"}</strong><p>{leadingNature ? `${percent(share(leadingNature.value, natureTotal))} da base · ${money(leadingNature.value)}` : natureMetricLabel}</p></div><div><span>Participação das ME</span><strong>{percent(summary.mpePercent)}</strong><p>Do valor total de compras no período selecionado.</p></div><div><span>Mês com maior valor na série</span><strong>{monthlyTotal > 0 ? `${MONTHS[peakMonth]} de ${year}` : "Sem dados disponíveis"}</strong><p>Valores de ME por mês de realização da licitação.</p></div></section>

    <div className="md-distribution-grid">
      <Panel id="md-nature-title" title="Compras por natureza da despesa" description={`${natureMetricLabel} em ${year}. Estes valores não representam o mesmo universo dos indicadores de licitações.`} actions={<ViewToggle label="natureza da despesa" table={natureTable} setTable={setNatureTable} />}>
        <div className="md-history-controls"><div className="md-history-select"><PublicFilterSelect name="base-natureza" label="Base do gráfico" icon="nature" variant="analysis" value={metric} options={[{ value: "dotacoes", label: "Dotações associadas às licitações" }, { value: "pagamentos", label: "Pagamentos efetivos" }]} onValueChange={(value) => setMetric(value as NatureMetric)} /></div></div>
        {!natures.length ? <div className="md-empty" role="status"><p>{metricError ?? (metric === "dotacoes" ? "A API não retornou dotações associadas às licitações neste recorte. Não há dados para montar a distribuição por natureza." : "A API não retornou pagamentos por natureza neste exercício.")}</p>{metric === "dotacoes" && Boolean(currentSource?.payments.data?.data.length) && <button className="gp-primary-button" type="button" onClick={() => setMetric("pagamentos")}>Ver pagamentos por natureza</button>}</div> : natureTable ? <div className="md-table-scroll"><table className="md-table"><thead><tr><th scope="col">Natureza da despesa</th><th scope="col">Valor de compra</th><th scope="col">% do total</th></tr></thead><tbody>{natures.map((item) => <tr key={item.code}><th scope="row">{item.label}</th><td>{money(item.value)}</td><td>{percent(share(item.value, natureTotal))}</td></tr>)}</tbody></table></div> : <div className="md-nature-bars" role="list" aria-label="Valores por natureza da despesa">{natures.map((item, index) => <div className="md-nature-row" role="listitem" key={item.code}><div className="md-nature-name"><span className="md-rank">{index + 1}</span><span>{item.label}</span></div><div className="md-nature-amount"><strong>{money(item.value)}</strong><span>{percent(share(item.value, natureTotal))} da base</span></div><div className="md-track" aria-hidden="true"><i style={{ width: `${share(item.value, maxNature)}%` }} /></div></div>)}</div>}
        {sourceObservation && <p className="md-footnote">{sourceObservation}</p>}
        {metric === "pagamentos" && currentSource?.payments.data && <p className="md-footnote">Coleta {currentSource.payments.data.coleta.coleta_id} · Referências {currentSource.payments.data.coleta.referencia_pagamentos_inicio} a {currentSource.payments.data.coleta.referencia_pagamentos_fim} · Conciliação: {currentSource.payments.data.coleta.reconciliado == null ? "não informada" : currentSource.payments.data.coleta.reconciliado ? "conciliada" : "não conciliada"} · {currentSource.payments.data.pendencias.reduce((sum, item) => sum + item.quantidade, 0)} pendências.</p>}
      </Panel>
      <Panel id="md-origin-title" title="Origem dos fornecedores" description="Sede cadastral das ME vencedoras, por valor vencido nas licitações.">
        {data.winners.error && <p role="status">{data.winners.error}</p>}
        <div className="md-origin-list">{origins.map((item) => <div className="md-origin" key={item.origin}><div><h3>{item.origin}</h3><strong>{percent(item.percentage)}</strong></div><div className="md-track" aria-hidden="true"><i style={{ width: `${item.percentage}%` }} /></div><p><b>{money(item.value)}</b><span>{item.count} {item.count === 1 ? "fornecedor" : "fornecedores"}</span></p></div>)}</div>
        {data.winners.data?.length ? <p className="md-footnote">Percentuais calculados sobre {money(supplierTotal)} vencidos por ME. Não representam pagamentos nem empresas de outros portes.</p> : !data.winners.error && <p role="status">Nenhuma ME vencedora foi retornada para este ano.</p>}
      </Panel>
    </div>

    <Panel id="md-month-title" title="Evolução mensal" description={`Valor vencido por ME, agrupado pelo mês de realização da licitação em ${year}. Não é uma série de pagamentos mensais.`} actions={<ViewToggle label="evolução mensal" table={monthlyTable} setTable={setMonthlyTable} />}>
      {data.winners.error || !monthlyTotal ? <p className="md-empty" role="status">{data.winners.error ?? "Não há valores de ME com data de realização para montar a série mensal."}</p> : <>
      <div className="md-chart-summary"><div><span>Total da série mensal</span><strong>{money(monthlyTotal)}</strong></div><div><span>Média mensal da série</span><strong>{money(monthlyTotal / 12)}</strong></div><div><span>Maior valor mensal</span><strong>{MONTHS[peakMonth]} · {money(monthly[peakMonth])}</strong></div></div>
      {monthlyTable ? <div className="md-table-scroll"><table className="md-table"><thead><tr><th scope="col">Mês</th><th scope="col">Valor de compra</th><th scope="col">% da série mensal</th></tr></thead><tbody>{monthly.map((value, index) => <tr key={MONTHS[index]}><th scope="row">{MONTHS[index]} de {year}</th><td>{money(value)}</td><td>{percent(share(value, monthlyTotal))}</td></tr>)}</tbody></table></div> : <div className="md-chart-scroll"><div className="md-month-chart"><Chart type="bar" height={350} options={monthlyOptions} series={[{ name: "Valor de compra", data: monthly }]} /></div></div>}
      {!monthlyTable && <p className="md-scroll-hint">Deslize o gráfico para ver os 12 meses ou selecione Tabela para consultar os valores.</p>}
      </>}
      {undatedValue > 0 && <p className="md-footnote">{money(undatedValue)} sem data de realização não foram distribuídos entre os meses.</p>}
    </Panel>

    <Panel id="md-history-title" title="Evolução histórica por natureza" description={`Compare ${natureMetricLabel.toLocaleLowerCase("pt-BR")} na mesma natureza. Anos sem cobertura aparecem como indisponíveis, não como zero.`} actions={<ViewToggle label="evolução histórica" table={historyTable} setTable={setHistoryTable} />}>
      <div className="md-history-controls"><div className="md-history-select"><PublicFilterSelect name="historico-natureza" label="Natureza da despesa" icon="nature" variant="analysis" value={selectedNature} options={GESTOR_PUBLICO_NATURES.map((item) => ({ value: item.code, label: item.label }))} onValueChange={(value) => setSelectedNature(value as NatureCode)} /></div><div className="md-history-change"><span>Variação de {HISTORY_YEARS[0]} a {HISTORY_YEARS.at(-1)}</span><strong>{historyVariation == null ? "Sem base para comparação" : `${historyVariation > 0 ? "+" : ""}${percent(historyVariation)}`}</strong></div></div>
      <div className="md-year-values">{history.map((item) => <div key={item.year}><span>{item.year}</span><strong>{item.value == null ? "Indisponível" : money(item.value)}</strong></div>)}</div>
      {metric === "pagamentos" && <p className="md-footnote">Cada ano representa o orçamento do exercício; as janelas de pagamento e a cobertura podem variar entre as coletas.</p>}
      {!history.some((item) => item.value != null) ? <p className="md-empty" role="status">A API não retornou dados desta natureza nos anos consultados. Escolha a base Pagamentos efetivos para consultar a série de pagamentos, quando disponível.</p> : historyTable ? <div className="md-table-scroll"><table className="md-table"><thead><tr><th scope="col">Ano</th><th scope="col">Natureza da despesa</th><th scope="col">Valor de compra</th></tr></thead><tbody>{history.map((item) => <tr key={item.year}><th scope="row">{item.year}</th><td>{selectedNatureName}</td><td>{item.value == null ? "Indisponível" : money(item.value)}</td></tr>)}</tbody></table></div> : <Chart type="area" height={310} options={historyOptions} series={[{ name: selectedNatureName, data: history.map((item) => item.value) }]} />}
    </Panel>

    <Panel id="md-supplier-title" title="Fornecedores contratados" description="Microempresas vencedoras ordenadas pelo valor vencido, com origem informada pelo cadastro da API.">
      {data.winners.error || !suppliers.length ? <p className="md-empty" role="status">{data.winners.error ?? "Nenhuma ME vencedora encontrada neste ano."}</p> : <div className="md-table-scroll"><table className="md-table md-supplier-table"><thead><tr><th scope="col">Fornecedor</th><th scope="col">Porte</th><th scope="col">Origem</th><th scope="col">Valor de compra</th><th scope="col">% do detalhamento</th></tr></thead><tbody>{suppliers.map((supplier, index) => <tr key={supplier.id}><th scope="row"><span className="md-supplier-name"><span className="md-rank">{index + 1}</span><span>{supplier.name}<small>{supplier.cnpj}</small></span></span></th><td><span className="md-size-badge">{supplier.size}</span></td><td>{supplier.origin}</td><td><strong>{money(supplier.total)}</strong></td><td>{percent(share(supplier.total, supplierTotal))}</td></tr>)}</tbody></table></div>}
    </Panel>

    <footer className="md-information" aria-label="Informações do município"><div><Store size={20} /><strong>{summary.name}/CE</strong></div><dl><div><dt>Código IBGE</dt><dd>{summary.id}</dd></div><div><dt>Código TCE</dt><dd>{summary.tceCode}</dd></div><div><dt>Período selecionado</dt><dd>{year}</dd></div><div><dt>Fonte da informação</dt><dd>TCE-CE · API Compras Abertas</dd></div></dl></footer>
  </div>;
}
