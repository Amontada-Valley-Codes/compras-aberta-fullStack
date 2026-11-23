"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Select from "@radix-ui/react-select";
import type { ApexOptions } from "apexcharts";
import { ArrowLeftRight, BarChart3, Building2, Check, ChevronDown, ChevronUp, CircleDollarSign, Info, MapPinned, RefreshCw, Store, Table2, X } from "lucide-react";
import { PublicFilterSelect } from "@/components/filters/PublicFilterSelect";
import { brandTokens } from "@/design-system/tokens";
import {
  GESTOR_PUBLICO_YEARS, getNatureOptions, natureName, type MunicipalitySummary, type NatureCode,
} from "./gestor-publico-data";
import "./comparativos.css";
import { PublicKpi } from "./GestorPublicoUI";
import { useMunicipalitySummaries } from "./use-gestor-public-data";

// Comparativo entre municípios com valores consultados na API de pagamentos.

const ChartSkeleton = () => <div className="gp-cmp-chart-skeleton" role="status" aria-label="Carregando gráfico" />;
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false, loading: ChartSkeleton });

const MAX_SELECTED = 5;
const SIDE_CHART_HEIGHT = 320;
// Uma cor por município, sempre a mesma enquanto ele estiver selecionado
// (paleta validada para daltonismo em todos os pares; o dourado tem contraste
// baixo, por isso os gráficos trazem legenda, rótulos e a visão em números).
const SERIES_COLORS = ["#2563a6", "#0b9aa6", "#d39a2c", "#a35bd6", "#d1495b"];
const EXAMPLE_NAMES = ["Amontada", "Itapipoca", "Trairi"];


// Nomes curtos para caber no eixo dos gráficos.
const NATURE_SHORT: Record<string, string> = {
  "39": "Serviços de terceiros",
  "30": "Material de consumo",
  "51": "Obras e instalações",
  "52": "Equipamentos",
  "32": "Distribuição gratuita",
  "40": "Tecnologia da informação",
  "35": "Consultoria",
};

type IndicatorKey = "mpePercent" | "localPercent" | "total" | "mpeValue" | "localValue" | "suppliers";
type IndicatorKind = "percent" | "money" | "count";
const INDICATORS: Array<{ key: IndicatorKey; label: string; phrase: string; kind: IndicatorKind; hint: string }> = [
  { key: "mpePercent", label: "Participação das ME", phrase: "participação das ME", kind: "percent", hint: "Percentual dos pagamentos destinado a micro e pequenas empresas." },
  { key: "localPercent", label: "Pagamentos a ME locais", phrase: "pagamentos a ME locais", kind: "percent", hint: "Percentual pago a micro e pequenas empresas da própria cidade." },
  { key: "total", label: "Valor total pago", phrase: "valor total pago", kind: "money", hint: "Soma dos pagamentos registrados no recorte escolhido." },
  { key: "mpeValue", label: "Valor pago a ME", phrase: "valor pago a ME", kind: "money", hint: "Total pago a micro e pequenas empresas." },
  { key: "localValue", label: "Valor pago a ME locais", phrase: "valor pago a ME locais", kind: "money", hint: "Total pago a micro e pequenas empresas da própria cidade." },
  { key: "suppliers", label: "ME locais identificadas", phrase: "número de ME locais identificadas", kind: "count", hint: "Empresas locais identificadas na coleta de pagamentos." },
];

const currency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compactCurrency = (value: number) => `R$ ${new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`;
const pct = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const integer = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const formatBy = (kind: IndicatorKind, value: number) => (kind === "percent" ? pct(value) : kind === "money" ? currency(value) : integer(value));
const axisBy = (kind: IndicatorKind, value: number) => (kind === "percent" ? `${Math.round(value)}%` : kind === "money" ? compactCurrency(value) : integer(value));

interface ComparisonRow {
  id: string;
  name: string;
  total: number;
  mpeValue: number;
  mpePercent: number;
  localPercent: number;
  suppliers: number;
  natures: Record<NatureCode, number>;
  localValue: number;
  updatedAt: string;
}

// Recorta os valores anuais do município pela natureza selecionada.
function toRow(summary: MunicipalitySummary, nature: NatureCode | ""): ComparisonRow {
  const total = nature ? summary.natures[nature] ?? 0 : summary.total;
  const mpeValue = nature ? summary.meNatures[nature] ?? 0 : summary.mpeValue;
  const localValue = nature ? summary.localNatures[nature] ?? 0 : summary.localValue;
  return {
    id: summary.id,
    name: summary.name,
    total,
    mpeValue,
    mpePercent: total ? mpeValue / total * 100 : 0,
    localPercent: total ? localValue / total * 100 : 0,
    localValue,
    suppliers: nature ? summary.localSuppliersByNature[nature] ?? 0 : summary.suppliers,
    natures: summary.natures,
    updatedAt: summary.updatedAt,
  };
}

function paymentComposition(row: ComparisonRow) {
  return {
    local: Math.max(0, row.localValue),
    otherMe: Math.max(0, row.mpeValue - row.localValue),
    otherSizes: Math.max(0, row.total - row.mpeValue),
    clamped: row.localValue < 0 || row.mpeValue < row.localValue || row.total < row.mpeValue,
  };
}

const COMPOSITION_PARTS = [
  { key: "local", label: "ME locais", color: "#11169b" },
  { key: "otherMe", label: "Demais ME", color: "#0b9a82" },
  { key: "otherSizes", label: "Demais portes", color: "#8797a6" },
] as const;

// Referência do Ceará: percentuais sobre a soma de todos os municípios;
// valores e fornecedores como média por município.
function stateReference(rows: ComparisonRow[]): Record<IndicatorKey, number> & { natures: Record<NatureCode, number> } {
  const count = Math.max(1, rows.length);
  const sum = (pick: (row: ComparisonRow) => number) => rows.reduce((total, row) => total + pick(row), 0);
  const total = sum((row) => row.total);
  return {
    total: total / count,
    mpeValue: sum((row) => row.mpeValue) / count,
    localValue: sum((row) => row.localValue) / count,
    mpePercent: total ? (sum((row) => row.mpeValue) / total) * 100 : 0,
    localPercent: total ? (sum((row) => row.localValue) / total) * 100 : 0,
    suppliers: sum((row) => row.suppliers) / count,
    natures: Object.fromEntries([...new Set(rows.flatMap((row) => Object.keys(row.natures)))].map((code) => [code, sum((row) => row.natures[code] ?? 0) / count])) as Record<NatureCode, number>,
  };
}

const chartBase: ApexOptions = {
  chart: { toolbar: { show: false }, zoom: { enabled: false }, fontFamily: `${brandTokens.typography.family}, sans-serif`, foreColor: "#637989", animations: { speed: 350 } },
  grid: { borderColor: "#e3ebf0", strokeDashArray: 4 },
  legend: { position: "top", horizontalAlign: "left", fontSize: "12px", markers: { size: 6 }, itemMargin: { horizontal: 10, vertical: 4 } },
  tooltip: { theme: "light" },
  states: { hover: { filter: { type: "darken" } } },
  noData: { text: "Sem dados para os filtros escolhidos" },
};

// ---------- Escolha dos municípios ----------
// Um campo por município, no visual do PublicFilterSelect. Cada campo novo
// aparece quando os anteriores estão preenchidos, até MAX_SELECTED.

function MunicipalitySlot({
  index,
  value,
  color,
  options,
  onChange,
  onRemove,
}: {
  index: number;
  value: string | null;
  color: string;
  options: Array<{ value: string; label: string }>;
  onChange: (id: string) => void;
  onRemove: () => void;
}) {
  const [search, setSearch] = useState("");
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return term ? options.filter((item) => item.label.toLocaleLowerCase("pt-BR").includes(term)) : options;
  }, [options, search]);
  const name = value ? options.find((item) => item.value === value)?.label ?? null : null;

  return (
    <div className={`public-filter-select gp-cmp-slot${name ? " is-filled" : ""}`}>
      <Select.Root value={value ?? ""} onValueChange={onChange} onOpenChange={(open) => { if (!open) setSearch(""); }}>
        <Select.Trigger className="public-filter-trigger" aria-label={`Município ${index + 1} para comparar`} title={name ?? undefined}>
          {name ? <i className="gp-cmp-dot gp-cmp-slot-dot" style={{ background: color }} aria-hidden="true" /> : <MapPinned className="public-filter-leading" aria-hidden="true" />}
          <span className="public-filter-copy">
            <small>Município {index + 1}</small>
            <span className={`public-filter-value${name ? "" : " is-placeholder"}`}>{name ?? "Selecione um município para comparar"}</span>
          </span>
          <Select.Icon asChild><ChevronDown className="public-filter-chevron" aria-hidden="true" /></Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="public-filter-content gp-cmp-slot-content" position="popper" sideOffset={6} collisionPadding={12}>
            <div className="public-filter-search-wrap">
              <input
                className="public-filter-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDownCapture={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                onKeyUp={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                autoComplete="off"
                placeholder="Buscar município"
                aria-label="Buscar município"
              />
            </div>
            <Select.ScrollUpButton className="public-filter-scroll"><ChevronUp size={16} /></Select.ScrollUpButton>
            <Select.Viewport className="public-filter-viewport">
              {visible.map((item) => (
                <Select.Item key={item.value} className="public-filter-item" value={item.value}>
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator className="public-filter-check"><Check size={15} /></Select.ItemIndicator>
                </Select.Item>
              ))}
              {!visible.length && <p className="public-filter-empty">Nenhum município encontrado.</p>}
            </Select.Viewport>
            <Select.ScrollDownButton className="public-filter-scroll"><ChevronDown size={16} /></Select.ScrollDownButton>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      {name && (
        <button type="button" className="gp-cmp-slot-remove" onClick={onRemove} aria-label={`Remover ${name}`}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ---------- Gráficos ----------

function IndicatorChart({ rows, colors, indicator, reference }: { rows: ComparisonRow[]; colors: string[]; indicator: (typeof INDICATORS)[number]; reference: number }) {
  const values = rows.map((row) => row[indicator.key]);
  // Máximo redondo (ex.: 52 → 60), com folga para o rótulo depois da barra.
  const top = Math.max(1, reference, ...values) * 1.12;
  const step = 10 ** Math.floor(Math.log10(top));
  const max = Math.ceil(top / step) * step;
  const options: ApexOptions = {
    ...chartBase,
    chart: { ...chartBase.chart, id: "comparativo-indicador", type: "bar" },
    colors,
    // Rótulo do valor logo depois do fim da barra.
    plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 4, borderRadiusApplication: "end", barHeight: "56%", dataLabels: { position: "top" } } },
    stroke: { show: true, width: 2, colors: ["#fff"] },
    dataLabels: { enabled: true, formatter: (value: number) => indicator.kind === "money" ? compactCurrency(value) : formatBy(indicator.kind, value), style: { fontSize: "12px", fontWeight: 700, colors: ["#25313c"] }, offsetX: 30 },
    legend: { show: false },
    xaxis: { categories: rows.map((row) => row.name), min: 0, max, tickAmount: 4, labels: { formatter: (value: string) => axisBy(indicator.kind, Number(value)) } },
    yaxis: { labels: { maxWidth: 150, style: { fontSize: "13px", colors: "#25313c" } } },
    tooltip: { ...chartBase.tooltip, y: { formatter: (value: number) => formatBy(indicator.kind, value), title: { formatter: () => indicator.label } } },
    annotations: {
      xaxis: [{
        x: reference,
        borderColor: "#7a8d9b",
        strokeDashArray: 5,
        label: { text: "Referência disponível", orientation: "horizontal", position: "top", textAnchor: "end", offsetX: -4, offsetY: -6, borderColor: "transparent", style: { background: "#eef3f6", color: "#3d5262", fontSize: "11px", fontWeight: 600 } },
      }],
    },
    responsive: [{ breakpoint: 640, options: { yaxis: { labels: { maxWidth: 96, style: { fontSize: "11px" } } }, dataLabels: { style: { fontSize: "11px" } } } }],
  };
  return <Chart type="bar" height={80 + rows.length * 42} options={options} series={[{ name: indicator.label, data: values }]} />;
}

// "Tecnologia da informação" → ["Tecnologia da", "informação"]: o eixo mostra
// as duas linhas em vez de cortar o nome com "…".
function twoLines(label: string): string[] {
  const words = label.split(" ");
  if (words.length < 2) return [label];
  const middle = Math.ceil(words.length / 2);
  return [words.slice(0, middle).join(" "), words.slice(middle).join(" ")];
}

function NatureChart({ rows, colors }: { rows: ComparisonRow[]; colors: string[] }) {
  const natures = [...new Set(rows.flatMap((row) => Object.keys(row.natures)))].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  const options: ApexOptions = {
    ...chartBase,
    chart: { ...chartBase.chart, id: "comparativo-natureza", type: "bar" },
    colors,
    plotOptions: { bar: { horizontal: true, borderRadius: 4, borderRadiusApplication: "end", barHeight: "78%" } },
    stroke: { show: true, width: 2, colors: ["#fff"] },
    dataLabels: { enabled: false },
    xaxis: { categories: natures.map((code) => twoLines(NATURE_SHORT[code] ?? natureName(code))), tickAmount: 4, labels: { formatter: (value: string) => compactCurrency(Number(value)) } },
    yaxis: { labels: { maxWidth: 150 } },
    tooltip: { ...chartBase.tooltip, shared: true, intersect: false, y: { formatter: currency } },
    responsive: [{ breakpoint: 640, options: { xaxis: { tickAmount: 2 }, yaxis: { labels: { maxWidth: 100, style: { fontSize: "11px" } } } } }],
  };
  const series = rows.map((row) => ({ name: row.name, data: natures.map((code) => row.natures[code] ?? 0) }));
  return <Chart type="bar" height={SIDE_CHART_HEIGHT} options={options} series={series} />;
}

function PaymentComposition({ rows }: { rows: ComparisonRow[] }) {
  const compositions = rows.map(paymentComposition);
  const options: ApexOptions = {
    ...chartBase,
    chart: { ...chartBase.chart, id: "comparativo-composicao", type: "bar", stacked: true },
    colors: COMPOSITION_PARTS.map((part) => part.color),
    plotOptions: { bar: { horizontal: true, barHeight: "56%", borderRadius: 3, borderRadiusApplication: "end", borderRadiusWhenStacked: "last" } },
    dataLabels: { enabled: false },
    xaxis: { categories: rows.map((row) => row.name), min: 0, tickAmount: 4, labels: { formatter: (value: string) => compactCurrency(Number(value)) } },
    yaxis: { labels: { maxWidth: 150, style: { fontSize: "12px" } } },
    legend: { ...chartBase.legend, onItemClick: { toggleDataSeries: false } },
    tooltip: { ...chartBase.tooltip, shared: true, intersect: false, y: { formatter: currency } },
    responsive: [{ breakpoint: 640, options: { xaxis: { tickAmount: 2 }, yaxis: { labels: { maxWidth: 96, style: { fontSize: "11px" } } } } }],
  };
  const series = COMPOSITION_PARTS.map((part) => ({ name: part.label, data: compositions.map((composition) => composition[part.key]) }));
  return (
    <>
      <Chart type="bar" height={110 + rows.length * 42} options={options} series={series} />
      <div className="gp-cmp-table-wrap" tabIndex={0} role="region" aria-label="Composição dos pagamentos por município">
        <table className="gp-cmp-table gp-cmp-composition-table">
          <caption>Composição dos pagamentos no recorte selecionado</caption>
          <thead><tr><th scope="col">Município</th>{COMPOSITION_PARTS.map((part) => <th scope="col" key={part.key}><i className="gp-cmp-dot" style={{ background: part.color }} aria-hidden="true" /> {part.label}</th>)}<th scope="col">Total informado</th></tr></thead>
          <tbody>{rows.map((row, index) => (
            <tr key={row.id}>
              <th scope="row">{row.name}</th>
              {COMPOSITION_PARTS.map((part) => <td key={part.key}>{currency(compositions[index][part.key])}</td>)}
              <td>{currency(row.total)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {compositions.some((composition) => composition.clamped) && <p className="gp-cmp-table-note">Valores negativos na composição são exibidos como zero. Os componentes podem não somar ao total informado pela API.</p>}
    </>
  );
}

function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <article className="analysis-chart-card gp-cmp-card"><header><div><h2>{title}</h2><p>{description}</p></div></header>{children}</article>;
}

// ---------- Números ----------

// Valor curto para a tabela (o completo aparece ao passar o mouse).
const shortBy = (kind: IndicatorKind, value: number) => (kind === "money" ? compactCurrency(value) : formatBy(kind, value));

interface NumberColumn {
  key: string;
  label: string;
  kind: IndicatorKind;
  value: (row: ComparisonRow) => number;
  reference: number;
}

// Uma linha por município e uma coluna por indicador; a média do Ceará fecha
// a tabela e o maior valor de cada coluna fica em negrito.
function NumbersGrid({ rows, colors, columns, firstHeader, showUpdated = false }: { rows: ComparisonRow[]; colors: string[]; columns: NumberColumn[]; firstHeader: string; showUpdated?: boolean }) {
  const best = columns.map((column) => Math.max(...rows.map(column.value)));
  return (
    <div className="gp-cmp-table-wrap" tabIndex={0} role="region" aria-label="Comparação entre municípios">
      <table className="gp-cmp-table">
        <thead>
          <tr>
            <th scope="col">{firstHeader}</th>
            {columns.map((column) => <th scope="col" key={column.key}>{column.label}</th>)}
            {showUpdated && <th scope="col">Atualização da coleta</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id} style={{ animationDelay: `${rowIndex * 45}ms` }}>
              <th scope="row"><i className="gp-cmp-dot" style={{ background: colors[rowIndex] }} aria-hidden="true" />{row.name}</th>
              {columns.map((column, columnIndex) => {
                const value = column.value(row);
                return (
                  <td key={column.key} className={value === best[columnIndex] ? "is-best" : undefined} title={formatBy(column.kind, value)}>
                    {shortBy(column.kind, value)}
                  </td>
                );
              })}
              {showUpdated && <td>{row.updatedAt && !Number.isNaN(Date.parse(row.updatedAt)) ? <time dateTime={row.updatedAt}>{new Date(row.updatedAt).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" })}</time> : "Não informada"}</td>}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Referência disponível</th>
            {columns.map((column) => <td key={column.key} title={formatBy(column.kind, column.reference)}>{shortBy(column.kind, column.reference)}</td>)}
            {showUpdated && <td>—</td>}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function NumbersTable({ rows, colors, reference, showNatures }: { rows: ComparisonRow[]; colors: string[]; reference: ReturnType<typeof stateReference>; showNatures: boolean }) {
  const indicatorColumns: NumberColumn[] = INDICATORS.map((indicator) => ({
    key: indicator.key, label: indicator.label, kind: indicator.kind, value: (row) => row[indicator.key], reference: reference[indicator.key],
  }));
  const natureCodes = [...new Set(rows.flatMap((row) => Object.keys(row.natures)))].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  const natureColumns: NumberColumn[] = natureCodes.map((code) => ({
    key: code, label: NATURE_SHORT[code] ?? natureName(code), kind: "money", value: (row) => row.natures[code] ?? 0, reference: reference.natures[code] ?? 0,
  }));
  return (
    <>
      <NumbersGrid rows={rows} colors={colors} columns={indicatorColumns} firstHeader="Município" showUpdated />
      <p className="gp-cmp-table-note">Maior valor não implica melhor desempenho. Fornecedores são contados em cada município, sem deduplicação entre cidades.</p>
      {showNatures && (
        <details className="gp-cmp-details">
          <summary>Ver valores por natureza da despesa <ChevronDown size={16} aria-hidden="true" /></summary>
          <NumbersGrid rows={rows} colors={colors} columns={natureColumns} firstHeader="Município" />
        </details>
      )}
    </>
  );
}

// ---------- Página ----------

export function GestorPublicoComparativos({ initialMunicipalities = [] }: { initialMunicipalities?: string[] }) {
  const [year, setYear] = useState<number>(GESTOR_PUBLICO_YEARS[0]);
  const [nature, setNature] = useState<NatureCode | "">("");
  const [indicatorKey, setIndicatorKey] = useState<IndicatorKey>("mpePercent");
  const [view, setView] = useState<"charts" | "numbers">("charts");

  const { data: summaries, loading, error } = useMunicipalitySummaries(year);
  const options = useMemo(() => summaries.map((item) => ({ value: item.id, label: item.name })).sort((a, b) => a.label.localeCompare(b.label, "pt-BR")), [summaries]);
  // Cada município guarda a cor que recebeu ao ser escolhido: remover um não
  // muda a cor dos outros.
  const [picks, setPicks] = useState<Array<{ id: string; color: number }>>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !summaries.length || picks.length || !initialMunicipalities.length) return;
    initialized.current = true;
    const ids = [...new Set(initialMunicipalities)].filter((id) => summaries.some((summary) => summary.id === id)).slice(0, MAX_SELECTED);
    setPicks(ids.map((id, color) => ({ id, color })));
  }, [initialMunicipalities, picks.length, summaries]);
  const allRows = useMemo(() => summaries.map((summary) => toRow(summary, nature)), [summaries, nature]);
  const reference = useMemo(() => stateReference(allRows), [allRows]);
  const picked = picks.flatMap((pick) => {
    const row = allRows.find((item) => item.id === pick.id);
    return row ? [{ row, color: SERIES_COLORS[pick.color] }] : [];
  });
  const rows = picked.map((item) => item.row);
  const colors = picked.map((item) => item.color);
  const indicator = INDICATORS.find((item) => item.key === indicatorKey)!;
  const selectedTotal = rows.reduce((sum, row) => sum + row.total, 0);
  const selectedMpe = rows.reduce((sum, row) => sum + row.mpeValue, 0);
  const selectedLocal = rows.reduce((sum, row) => sum + row.localValue, 0);

  // Campos visíveis: os preenchidos + um vazio (mínimo de dois), até o limite.
  const slotCount = Math.min(MAX_SELECTED, Math.max(2, picks.length + 1));
  const choose = (index: number, id: string) => setPicks((current) => {
    if (index < current.length) return current.map((pick, position) => (position === index ? { ...pick, id } : pick));
    const used = new Set(current.map((pick) => pick.color));
    const color = SERIES_COLORS.findIndex((_, slot) => !used.has(slot));
    return [...current, { id, color }];
  });
  const remove = (index: number) => setPicks((current) => current.filter((_, position) => position !== index));
  const clear = () => setPicks([]);
  const useExample = () => {
    const ids = EXAMPLE_NAMES.map((name) => summaries.find((item) => item.name === name)?.id).filter((id): id is string => Boolean(id));
    setPicks(ids.map((id, color) => ({ id, color })));
  };

  const leader = rows.length ? rows.reduce((best, row) => (row[indicator.key] > best[indicator.key] ? row : best)) : null;
  const leaderText = leader && (() => {
    const value = leader[indicator.key];
    const ref = reference[indicator.key];
    const tied = rows.filter((row) => row[indicator.key] === value);
    const subject = tied.length > 1 ? `${tied.length} municípios empatados` : leader.name;
    const delta = indicator.kind === "percent" ? `${Math.abs(value - ref).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.` : ref > 0 ? pct(Math.abs((value / ref - 1) * 100)) : null;
    return <><b>{subject}</b> · Maior valor em {indicator.phrase}: <b>{formatBy(indicator.kind, value)}</b>{value === ref ? ", igual à referência disponível." : delta ? `, ${delta} ${value > ref ? "acima" : "abaixo"} da referência disponível.` : ". Referência igual a zero; variação relativa não calculável."}</>;
  })();

  return (
    <div className="gp-main gp-analysis-main gp-cmp">
      <section className="analysis-title-row gp-analysis-title-row">
        <div>
          <h1>Compare municípios</h1>
          <p>Compare pagamentos, participação de ME e pagamentos locais em até cinco municípios.</p>
        </div>
        {rows.length > 0 && <button type="button" className="gp-text-button" onClick={clear}><RefreshCw size={15} /> Limpar seleção</button>}
      </section>

      <div className="gp-cmp-slots" role="group" aria-label="Municípios para comparar">
        {Array.from({ length: slotCount }, (_, index) => {
          const pick = picks[index];
          const others = new Set(picks.filter((_, position) => position !== index).map((item) => item.id));
          return (
            <div className="gp-cmp-slot-group" key={pick ? `${pick.id}-${index}` : `vazio-${index}`}>
              {index > 0 && <span className="gp-cmp-vs" aria-hidden="true"><ArrowLeftRight size={16} /></span>}
              <MunicipalitySlot
                index={index}
                value={pick?.id ?? null}
                color={pick ? SERIES_COLORS[pick.color] : SERIES_COLORS[0]}
                options={options.filter((item) => !others.has(item.value))}
                onChange={(id) => choose(index, id)}
                onRemove={() => remove(index)}
              />
            </div>
          );
        })}
      </div>

      <div className="analysis-filters gp-analysis-filters gp-cmp-filters" role="group" aria-label="Filtros do comparativo">
        <div className="analysis-filter-fields">
          <PublicFilterSelect name="comparativo-ano" label="Ano" icon="year" variant="analysis" value={String(year)} options={GESTOR_PUBLICO_YEARS.map((item) => ({ value: String(item), label: String(item) }))} onValueChange={(value) => setYear(Number(value) || GESTOR_PUBLICO_YEARS[0])} />
          <PublicFilterSelect name="comparativo-natureza" label="Natureza da despesa" allLabel="Todas as naturezas" icon="nature" variant="analysis" value={nature} options={getNatureOptions(summaries).map((item) => ({ value: item.code, label: NATURE_SHORT[item.code] ?? item.label }))} onValueChange={(value) => setNature(value as NatureCode | "")} />
          <PublicFilterSelect name="comparativo-indicador" label="Indicador" icon="sort" variant="analysis" value={indicatorKey} options={INDICATORS.map((item) => ({ value: item.key, label: item.label }))} onValueChange={(value) => setIndicatorKey((value || "mpePercent") as IndicatorKey)} />
        </div>
      </div>

      {error ? <section className="gp-cmp-empty" role="status"><Info />{error}</section> : loading ? <section className="gp-cmp-empty" role="status"><Info />Carregando pagamentos dos municípios pela API...</section> : rows.length < 2 ? (
        <section className="gp-cmp-empty" role="status">
          <BarChart3 aria-hidden="true" />
          <strong>{rows.length === 0 ? "Escolha os municípios para começar" : "Falta só mais um município"}</strong>
          <p>Selecione pelo menos dois municípios nos campos acima para ver a comparação.</p>
          {rows.length === 0 && <button type="button" className="gp-primary-button" onClick={useExample}>Comparar Amontada, Itapipoca e Trairi</button>}
        </section>
      ) : (
        <>
          <section className="analysis-kpis gp-kpis-4" aria-label="Totais dos municípios selecionados">
            <PublicKpi icon={<Building2 />} label="Quantos municípios estão sendo comparados?" value={String(rows.length)} detail={`${year} · ${nature ? NATURE_SHORT[nature] ?? natureName(nature) : "Todas as naturezas"}`} />
            <PublicKpi icon={<CircleDollarSign />} label="Quanto foi pago no total?" amount={selectedTotal} detail="Soma dos municípios selecionados" />
            <PublicKpi icon={<Store />} label="Quanto foi pago a ME?" amount={selectedMpe} detail={selectedTotal ? `${pct(selectedMpe / selectedTotal * 100)} do total selecionado` : "Sem base percentual"} accent />
            <PublicKpi icon={<MapPinned />} label="Quanto foi pago a ME locais?" amount={selectedLocal} detail={selectedTotal ? `${pct(selectedLocal / selectedTotal * 100)} do total selecionado` : "Sem base percentual"} />
          </section>
          <div className="gp-cmp-toolbar">
            {/* A chave refaz a animação de entrada quando a frase muda. */}
            <p className="gp-cmp-leader" key={`${leader?.id}-${indicatorKey}-${year}-${nature}`}>{leaderText}</p>
            <div className="analysis-chart-controls gp-cmp-view" role="group" aria-label="Forma de comparar">
              <button type="button" className={view === "charts" ? "is-active" : ""} aria-pressed={view === "charts"} onClick={() => setView("charts")}><BarChart3 size={15} /> <span>Gráficos</span></button>
              <button type="button" className={view === "numbers" ? "is-active" : ""} aria-pressed={view === "numbers"} onClick={() => setView("numbers")}><Table2 size={15} /> <span>Números</span></button>
            </div>
          </div>

          {view === "charts" ? (
            <div className="gp-cmp-grid gp-cmp-results" key="charts">
              <ChartCard title={indicator.label} description={`${indicator.hint} Referência disponível: ${formatBy(indicator.kind, reference[indicator.key])} · ${summaries.length} municípios.`}>
                <IndicatorChart rows={rows} colors={colors} indicator={indicator} reference={reference[indicator.key]} />
              </ChartCard>
              <ChartCard title="Composição dos pagamentos por município" description="ME locais identificadas, demais ME e demais portes no mesmo recorte. Demais ME inclui empresas sem sede local identificada; não significa necessariamente fornecedores externos.">
                <PaymentComposition rows={rows} />
              </ChartCard>
              {!nature && (
                <ChartCard title="Compras por natureza da despesa" description="Em que tipo de compra cada município gasta mais.">
                  <NatureChart rows={rows} colors={colors} />
                </ChartCard>
              )}
            </div>
          ) : (
            <article className="analysis-chart-card gp-cmp-card gp-cmp-results" key="numbers">
              <header><div><h2>Comparação em números</h2><p>{year} · {summaries.length} municípios na referência disponível.</p></div></header>
              <NumbersTable rows={rows} colors={colors} reference={reference} showNatures={!nature} />
            </article>
          )}
        </>
      )}

      <p className="gp-source-note"><Info size={15} /> Fonte: API de pagamentos. Referência: {summaries.length} municípios disponíveis em {year}, no mesmo recorte. Percentuais calculados sobre os valores somados; valores e fornecedores como média por município. Coletas podem ter datas diferentes.</p>
    </div>
  );
}
