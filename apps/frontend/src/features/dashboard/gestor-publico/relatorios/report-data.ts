// Sem "use client": monta o relatório no servidor, só com dados reais.
//
// Base comum de todos os modelos: pagamentos efetivos da Prefeitura (TCE-CE,
// pela API Compras Abertas), com todos os portes de empresa:
// - /analytics/pagamentos/resumo: total pago por natureza e por categoria de
//   porte (ME, EPP, DEMAIS e categorias sem porte). É o valor oficial;
// - /analytics/pagamentos/fornecedores (categoria vazia = todos os portes):
//   fornecedor a fornecedor, na mesma coleta do resumo. Dá o número de
//   fornecedores e de pagamentos de cada porte e a lista com CNPJ;
// - /analytics/pagamentos/outros-portes: evolução mensal de EPP e demais
//   empresas (ano civil; a API não traz a série mensal das ME);
// - cadastro de empresas (/empresas): UF e cidade de cada fornecedor;
// - licitações e o comparativo de classificação dos vencedores (modelo de
//   despesas), que medem licitação, não pagamento.
//
// O resumo e a lista de fornecedores são obrigatórios. As demais fontes são
// complementares: se falharem, a seção correspondente explica o motivo e o
// restante do relatório sai normalmente.

import { ApiError } from "@/api/errors";
import {
  ApiNotFoundError,
  loadBids,
  loadClassificationComparison,
  loadCompanyDirectory,
  loadPaymentsByState,
  MAX_BIDS,
  type ApiBid,
  type ApiClassificationComparison,
  type ApiCompany,
  type ApiPaymentsByState,
} from "@/features/dashboard/gestor/gestor-api";
import { formatDateBr, normalizeCity } from "@/features/dashboard/gestor/gestor-domain";
import { formatCnpj } from "@/features/public-data/format";
import { KNOWN_NATURE_CODES, natureLabel, titleCase } from "@/features/public-data/plain-language";
import { getOtherSizesPaymentsService, getPaymentsSummaryService, listPaymentSuppliersService } from "@/services/analytics/payments.service";
import type { OtherSizesPaymentsResponse, PaymentNature, PaymentsSummaryResponse, PaymentSupplier } from "@/services/analytics/payments.types";
import type { MunicipalityOption } from "@/services/municipalities/municipalities.types";
import { reportModel, type ReportModelId } from "./report-catalog";
import type { ReportBlock, ReportDocument, ReportKpi, ReportSection } from "./report-document";
import {
  addCents,
  emptyTotals,
  groupSuppliers,
  InvalidAmountError,
  natureTotals,
  PORTE_HEADER,
  PORTE_LABEL,
  PORTE_SHORT,
  PORTE_TONE,
  porteOf,
  PORTES,
  share,
  statsByPorte,
  summaryTotals,
  toCents,
  totalsOf,
  unclassifiedBreakdown,
  type Porte,
  type PorteStats,
  type PorteTotals,
  type SupplierAggregate,
} from "./report-portes";

export interface ReportRequest {
  model: Exclude<ReportModelId, "receitas">;
  municipality: MunicipalityOption;
  year: number;
  natureCode?: string;
}

// Mensagem pronta para mostrar ao gestor.
export class ReportDataError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

const SOURCE = "Tribunal de Contas do Estado do Ceará (TCE-CE), pela API Compras Abertas";
const PAGE_SIZE = 100;
const MAX_SUPPLIER_PAGES = 300;
const PARALLEL_PAGES = 8;
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const COMPANY_PORTES: Porte[] = ["ME", "EPP", "DEMAIS"];

// ---------- Formatação ----------
// O Intl separa "R$" do número com um espaço especial; fica um espaço não
// separável comum (U+00A0), para "R$" nunca ficar sozinho no fim da linha.
// Cada formato de arquivo o desenha como espaço normal.
const moneyFormat = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const amountFormat = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Valor em reais a partir de centavos.
const money = (cents: number) => moneyFormat.format(cents / 100).replace(/\s/g, "\u00A0");
// Sem "R$": nas tabelas por porte o cabeçalho já diz "(R$)".
const amount = (cents: number) => amountFormat.format(cents / 100);
const count = (value: number) => value.toLocaleString("pt-BR");
const pct = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? "—" : `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const plural = (value: number, one: string, many: string) => `${count(value)} ${value === 1 ? one : many}`;
const upper = (value: string) => value.toLocaleUpperCase("pt-BR");
// "202501" → "01/2025"
const reference = (value: string | null | undefined) => (/^\d{6}$/.test(value ?? "") ? `${value!.slice(4)}/${value!.slice(0, 4)}` : null);
const sumBy = <T>(rows: readonly T[], value: (row: T) => number) => rows.reduce((total, row) => total + value(row), 0);

// ---------- Carregamento ----------
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Erro de consulta (filtro inválido, sem dados): tentar de novo não adianta.
const isClientError = (error: unknown) =>
  error instanceof ApiNotFoundError || (error instanceof ApiError && error.status != null && error.status >= 400 && error.status < 500);

// A API às vezes demora a acordar: tenta de novo uma vez antes de desistir.
async function withRetry<T>(load: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await load();
    } catch (error) {
      if (attempt >= 2 || isClientError(error)) throw error;
      await wait(1_000);
    }
  }
}

type Optional<T> = { ok: true; value: T } | { ok: false; reason: string };

// Fonte complementar: a falha vira um aviso na seção, não um erro do relatório.
async function optional<T>(what: string, load: () => Promise<T>): Promise<Optional<T>> {
  try {
    return { ok: true, value: await withRetry(load) };
  } catch (error) {
    const missing = error instanceof ApiNotFoundError || (error instanceof ApiError && error.status === 404);
    if (!missing) console.warn(`Relatório do gestor: falha ao carregar ${what}`, error);
    return {
      ok: false,
      reason: missing
        ? `A fonte ainda não tem ${what} para este recorte.`
        : `Não foi possível carregar ${what} agora. Esta parte ficou de fora; o restante do relatório não foi afetado. Gere de novo em instantes para incluí-la.`,
    };
  }
}

async function loadSummary({ municipality, year }: ReportRequest): Promise<PaymentsSummaryResponse> {
  try {
    return await withRetry(() => getPaymentsSummaryService({ codigo_municipio: municipality.tceCode, ano: year }));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new ReportDataError(
        `Ainda não há apuração de pagamentos concluída para ${municipality.name} em ${year}. Escolha outro ano ou município.`,
        404,
      );
    }
    throw new ReportDataError("Não foi possível carregar o resumo de pagamentos agora. Tente novamente em instantes.");
  }
}

// Todas as páginas de fornecedores (todos os portes) da coleta do resumo.
// Página de outra coleta ou fora de ordem invalida a lista: um relatório com
// fornecedores faltando não é publicado.
async function loadSupplierRows({ municipality, year }: ReportRequest, collection: number): Promise<PaymentSupplier[]> {
  const rows: PaymentSupplier[] = [];
  try {
    for (let start = 0; start < MAX_SUPPLIER_PAGES; start += PARALLEL_PAGES) {
      const pages = await Promise.all(
        Array.from({ length: Math.min(PARALLEL_PAGES, MAX_SUPPLIER_PAGES - start) }, (_, index) =>
          withRetry(() =>
            listPaymentSuppliersService({
              codigo_municipio: municipality.tceCode,
              ano: year,
              coleta_id: collection,
              categoria_porte: "",
              limit: PAGE_SIZE,
              offset: (start + index) * PAGE_SIZE,
            }),
          ),
        ),
      );
      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        if (page.coleta_id !== collection || page.offset !== (start + index) * PAGE_SIZE) {
          throw new ReportDataError("A fonte devolveu fornecedores de outra coleta. Tente novamente em instantes.");
        }
        rows.push(...page.data);
        if (page.data.length < PAGE_SIZE) return rows;
      }
    }
  } catch (error) {
    if (error instanceof ReportDataError) throw error;
    throw new ReportDataError("Não foi possível carregar a lista de fornecedores agora. Tente novamente em instantes.");
  }
  throw new ReportDataError("A lista de fornecedores ultrapassou o limite do relatório. Escolha uma natureza da despesa para reduzir o recorte.");
}

interface Dataset {
  request: ReportRequest;
  summary: PaymentsSummaryResponse;
  // Naturezas do recorte, do maior para o menor valor pago.
  natures: PaymentNature[];
  // Valores oficiais do resumo, por porte.
  totals: PorteTotals;
  payments: number;
  rows: PaymentSupplier[];
  suppliers: SupplierAggregate[];
  stats: Record<Porte, PorteStats>;
  showUnclassified: boolean;
  // Diferença entre a lista de fornecedores e o resumo, se houver.
  mismatch: string | null;
}

async function loadDataset(request: ReportRequest): Promise<Dataset> {
  const summary = await loadSummary(request);
  const allRows = await loadSupplierRows(request, summary.coleta.coleta_id);
  const natureCode = request.natureCode;
  const natures = summary.data
    .filter((row) => !natureCode || row.codigo_natureza === natureCode)
    .sort((a, b) => toCents(b.total_controle) - toCents(a.total_controle));
  const rows = natureCode ? allRows.filter((row) => row.codigo_natureza === natureCode) : allRows;
  const totals = summaryTotals(natures);
  const suppliers = groupSuppliers(rows);
  const stats = statsByPorte(suppliers);

  const listed = totalsOf(rows);
  const differences = PORTES.filter((porte) => Math.abs(listed[porte] - totals[porte]) > 1);
  const mismatch = differences.length
    ? `A lista de fornecedores soma ${money(listed.total)} e o resumo oficial, ${money(totals.total)} (${differences
        .map((porte) => `${PORTE_SHORT[porte]}: ${money(listed[porte])} na lista e ${money(totals[porte])} no resumo`)
        .join("; ")}). Os valores por porte seguem o resumo; as contagens de fornecedores seguem a lista.`
    : null;

  return {
    request,
    summary,
    natures,
    totals,
    payments: sumBy(natures, (row) => row.quantidade_pagamentos || 0),
    rows,
    suppliers,
    stats,
    showUnclassified: totals.OUTROS > 0 || stats.OUTROS.suppliers > 0,
    mismatch,
  };
}

const loadDirectory = () => optional("o cadastro de empresas (sede dos fornecedores)", () => loadCompanyDirectory());
const loadStates = ({ municipality, year, natureCode }: ReportRequest) =>
  optional("a distribuição dos pagamentos por estado", () => loadPaymentsByState(municipality.tceCode, year, natureCode));
const loadOtherSizes = ({ municipality, year }: ReportRequest) =>
  optional("a evolução mensal de EPP e demais empresas", () => getOtherSizesPaymentsService({ codigo_municipio: municipality.tceCode, ano: year }));

// ---------- Blocos reutilizados ----------
const NOTE_VALUES = "Valores em reais (R$). Pagamento efetivo: notas de pagamento não estornadas vinculadas a empenhos do orçamento do exercício.";

function porteKpi(dataset: Dataset, porte: Porte): ReportKpi {
  return {
    label: PORTE_LABEL[porte],
    value: money(dataset.totals[porte]),
    detail: `${pct(share(dataset.totals[porte], dataset.totals.total))} do total · ${plural(dataset.stats[porte].suppliers, "fornecedor", "fornecedores")}`,
  };
}

function mpeKpi(dataset: Dataset): ReportKpi {
  const mpe = dataset.totals.ME + dataset.totals.EPP;
  return { label: "Micro e pequenas empresas (ME + EPP)", value: money(mpe), detail: `${pct(share(mpe, dataset.totals.total))} do total pago` };
}

function totalKpi(dataset: Dataset): ReportKpi {
  return { label: "Total pago", value: money(dataset.totals.total), detail: plural(dataset.payments, "pagamento", "pagamentos") };
}

interface PorteRow {
  label: string;
  totals: PorteTotals;
  suppliers?: number;
}

// Tabela padrão de valores por porte: ME, EPP, demais, (sem classificação),
// total e participação das micro e pequenas empresas.
function porteValueTable(options: {
  title?: string;
  firstColumn: string;
  rows: PorteRow[];
  total?: PorteRow;
  showUnclassified: boolean;
  showSuppliers?: boolean;
  emptyText: string;
}): ReportBlock {
  const portes = options.showUnclassified ? PORTES : COMPANY_PORTES;
  const cells = (row: PorteRow) => [
    row.label,
    ...(options.showSuppliers ? [row.suppliers == null ? "—" : count(row.suppliers)] : []),
    ...portes.map((porte) => amount(row.totals[porte])),
    amount(row.totals.total),
    pct(share(row.totals.ME + row.totals.EPP, row.totals.total)),
  ];
  return {
    kind: "table",
    title: options.title,
    columns: [
      { label: options.firstColumn, width: options.showUnclassified ? 2.2 : 2.5 },
      ...(options.showSuppliers ? [{ label: "Fornecedores", width: 1, align: "right" as const }] : []),
      ...portes.map((porte) => ({ label: `${PORTE_SHORT[porte]} (R$)`, width: 1.45, align: "right" as const })),
      { label: "Total (R$)", width: 1.55, align: "right" },
      { label: "% ME + EPP", width: 0.95, align: "right" },
    ],
    rows: options.rows.map(cells),
    total: options.total && options.rows.length ? cells(options.total) : undefined,
    emptyText: options.emptyText,
  };
}

function porteLegend(showUnclassified: boolean) {
  return (showUnclassified ? PORTES : COMPANY_PORTES).map((porte) => ({ label: PORTE_SHORT[porte], tone: PORTE_TONE[porte] }));
}

function compositionChart(title: string, rows: PorteRow[], showUnclassified: boolean, emptyText: string): ReportBlock {
  const portes = showUnclassified ? PORTES : COMPANY_PORTES;
  return {
    kind: "stacked",
    title,
    legend: porteLegend(showUnclassified),
    items: rows.map((row) => ({
      label: row.label,
      segments: portes.map((porte) => row.totals[porte]),
      display: `${pct(share(row.totals.ME + row.totals.EPP, row.totals.total))} ME + EPP`,
    })),
    emptyText,
  };
}

function natureRows(dataset: Dataset): PorteRow[] {
  const suppliersByNature = new Map<string, Set<string>>();
  for (const row of dataset.rows) {
    const set = suppliersByNature.get(row.codigo_natureza) ?? new Set<string>();
    set.add(row.documento);
    suppliersByNature.set(row.codigo_natureza, set);
  }
  return dataset.natures.map((row) => ({
    label: natureLabel(row.codigo_natureza, row.nome_natureza),
    totals: natureTotals(row),
    suppliers: suppliersByNature.get(row.codigo_natureza)?.size ?? 0,
  }));
}

function natureFilterNote(request: ReportRequest): ReportBlock[] {
  return request.natureCode
    ? [{ kind: "note", text: `Recorte por natureza da despesa: entram apenas os pagamentos de "${natureLabel(request.natureCode)}".` }]
    : [];
}

// Seção comum a todos os modelos: a comparação entre os portes.
function porteComparisonSection(dataset: Dataset): ReportSection {
  const portes = dataset.showUnclassified ? PORTES : COMPANY_PORTES;
  const { totals, stats } = dataset;
  const totalSuppliers = sumBy(portes, (porte) => stats[porte].suppliers);
  const mpe = totals.ME + totals.EPP;
  const blocks: ReportBlock[] = [
    {
      kind: "paragraph",
      text:
        totals.total > 0
          ? `No recorte, a Prefeitura pagou ${money(totals.total)}. Microempresas receberam ${money(totals.ME)} (${pct(share(totals.ME, totals.total))}), empresas de pequeno porte ${money(totals.EPP)} (${pct(share(totals.EPP, totals.total))}) e as demais empresas ${money(totals.DEMAIS)} (${pct(share(totals.DEMAIS, totals.total))}). Juntas, micro e pequenas empresas ficaram com ${pct(share(mpe, totals.total))} do valor.`
          : "Não há pagamentos registrados no recorte escolhido.",
    },
    {
      kind: "table",
      columns: [
        { label: "Porte da empresa", width: 2.7 },
        { label: "Fornecedores", width: 1.05, align: "right" },
        { label: "Pagamentos", width: 1.05, align: "right" },
        { label: "Valor pago", width: 1.8, align: "right" },
        { label: "% do valor", width: 0.95, align: "right" },
        { label: "Média por fornecedor", width: 1.6, align: "right" },
      ],
      rows: totals.total > 0 || totalSuppliers > 0
        ? portes.map((porte) => [
            PORTE_LABEL[porte],
            count(stats[porte].suppliers),
            count(stats[porte].payments),
            money(totals[porte]),
            pct(share(totals[porte], totals.total)),
            stats[porte].suppliers ? money(totals[porte] / stats[porte].suppliers) : "—",
          ])
        : [],
      total: [
        "Total",
        count(totalSuppliers),
        count(sumBy(portes, (porte) => stats[porte].payments)),
        money(totals.total),
        pct(totals.total > 0 ? 100 : null),
        totalSuppliers ? money(totals.total / totalSuppliers) : "—",
      ],
      emptyText: "Nenhum pagamento no recorte escolhido.",
    },
    {
      kind: "bars",
      title: "Valor pago por porte",
      items: portes.map((porte) => ({ label: PORTE_LABEL[porte], value: totals[porte], display: money(totals[porte]), tone: PORTE_TONE[porte] })),
      emptyText: "Nenhum pagamento no recorte escolhido.",
    },
  ];
  if (dataset.showUnclassified) {
    const breakdown = unclassifiedBreakdown(dataset.natures);
    blocks.push({
      kind: "note",
      text: `"Sem classificação de porte" reúne pagamentos que a fonte não classifica como ME, EPP ou demais empresas${
        breakdown.length ? `: ${breakdown.map((item) => `${item.label} (${money(item.cents)})`).join("; ")}` : ""
      }. Esses valores entram no total, mas não em nenhum dos três portes.`,
    });
  }
  if (dataset.mismatch) blocks.push({ kind: "note", text: dataset.mismatch });
  return {
    title: "Comparativo por porte de empresa",
    description: "Quanto cada porte recebeu, com o número de fornecedores e de pagamentos.",
    blocks,
  };
}

function natureValueSection(dataset: Dataset, title = "Valor pago por natureza e porte"): ReportSection {
  const rows = natureRows(dataset);
  return {
    title,
    description: "Pagamentos de cada natureza da despesa divididos entre microempresas, empresas de pequeno porte e demais empresas.",
    blocks: [
      porteValueTable({
        firstColumn: "Natureza da despesa",
        rows,
        total: { label: "Total", totals: dataset.totals },
        showUnclassified: dataset.showUnclassified,
        emptyText: "Nenhum pagamento nas naturezas do recorte.",
      }),
      compositionChart("Composição do valor pago por natureza", rows.filter((row) => row.totals.total > 0), dataset.showUnclassified, "Nenhum pagamento nas naturezas do recorte."),
      { kind: "note", text: NOTE_VALUES },
    ],
  };
}

// ---------- Localização dos fornecedores ----------
type Origin = "local" | "state" | "other" | "unknown";
const ORIGINS: Origin[] = ["local", "state", "other", "unknown"];
const ORIGIN_LABEL: Record<Origin, string> = {
  local: "Do próprio município",
  state: "De outros municípios do Ceará",
  other: "De outros estados",
  unknown: "Sede não identificada",
};

interface Location {
  uf: string | null;
  city: string | null;
  origin: Origin;
}

function locate(supplier: SupplierAggregate, directory: Map<string, ApiCompany>, municipalityName: string): Location {
  const company = supplier.cnpj ? directory.get(supplier.cnpj) : undefined;
  const uf = company?.uf_empresa?.trim().toUpperCase() || null;
  const city = company?.municipio_empresa?.trim() || null;
  if (!uf) return { uf: null, city, origin: "unknown" };
  if (uf !== "CE") return { uf, city, origin: "other" };
  if (!city) return { uf, city, origin: "unknown" };
  return { uf, city, origin: normalizeCity(city) === normalizeCity(municipalityName) ? "local" : "state" };
}

function groupBy(
  suppliers: SupplierAggregate[],
  keyOf: (supplier: SupplierAggregate) => string | null,
): Array<{ label: string; totals: PorteTotals; suppliers: number }> {
  const groups = new Map<string, { totals: PorteTotals; suppliers: number }>();
  for (const supplier of suppliers) {
    const key = keyOf(supplier);
    if (key == null) continue;
    const group = groups.get(key) ?? { totals: emptyTotals(), suppliers: 0 };
    addCents(group.totals, supplier.porte, supplier.cents);
    group.suppliers += 1;
    groups.set(key, group);
  }
  return [...groups].map(([label, group]) => ({ label, ...group })).sort((a, b) => b.totals.total - a.totals.total || a.label.localeCompare(b.label, "pt-BR"));
}

const sumRows = (rows: Array<{ totals: PorteTotals; suppliers: number }>): PorteRow => {
  const totals = emptyTotals();
  for (const row of rows) for (const porte of PORTES) addCents(totals, porte, row.totals[porte]);
  return { label: "Total", totals, suppliers: sumBy(rows, (row) => row.suppliers) };
};

const NOTE_LOCATION =
  "A sede vem do cadastro de empresas consultado na geração do relatório e pode não ser a da data do pagamento. Fornecedores sem CNPJ válido ou sem sede no cadastro aparecem como não identificados.";

function unavailable(title: string, description: string, reason: string): ReportSection {
  return { title, description, blocks: [{ kind: "note", text: reason }] };
}

// ---------- Localização: agregado oficial e divisão por porte ----------
const STATE_CLASS_LABEL: Record<string, string> = {
  SEM_UF: "Sede não identificada",
  DOCUMENTO_NAO_CNPJ: "Favorecido sem CNPJ",
};

// Pagamentos por UF da sede, todos os portes, direto do agregado da API (o
// mesmo universo do resumo). Não separa porte.
function stateTotalsBlocks(dataset: Dataset, states: Optional<ApiPaymentsByState[]>): ReportBlock[] {
  if (!states.ok) return [{ kind: "note", text: states.reason }];
  const rows = [...states.value].sort((a, b) => toCents(b.total_pago) - toCents(a.total_pago));
  const total = sumBy(rows, (row) => toCents(row.total_pago));
  const blocks: ReportBlock[] = [
    {
      kind: "table",
      title: "Todos os portes, por UF da sede",
      columns: [
        { label: "UF da sede", width: 2.6 },
        { label: "Empresas", width: 1, align: "right" },
        { label: "Pagamentos", width: 1.1, align: "right" },
        { label: "Valor pago", width: 1.8, align: "right" },
        { label: "% do total", width: 1, align: "right" },
      ],
      rows: rows.map((row) => [
        row.uf_empresa?.trim() || STATE_CLASS_LABEL[row.classificacao_localizacao] || titleCase(row.classificacao_localizacao.replace(/_/g, " ")),
        count(row.quantidade_empresas || 0),
        count(row.quantidade_pagamentos || 0),
        money(toCents(row.total_pago)),
        pct(share(toCents(row.total_pago), total)),
      ]),
      total: ["Total", count(sumBy(rows, (row) => row.quantidade_empresas || 0)), count(sumBy(rows, (row) => row.quantidade_pagamentos || 0)), money(total), pct(total > 0 ? 100 : null)],
      emptyText: "Nenhum pagamento no recorte.",
    },
  ];
  if (Math.abs(total - dataset.totals.total) > 1) {
    blocks.push({ kind: "note", text: `A distribuição por estado soma ${money(total)} e o resumo oficial, ${money(dataset.totals.total)}.` });
  }
  return blocks;
}

type Locations = Map<string, Location>;

function locateAll(suppliers: SupplierAggregate[], directory: Map<string, ApiCompany>, municipalityName: string): Locations {
  return new Map(suppliers.map((supplier) => [supplier.key, locate(supplier, directory, municipalityName)]));
}

// Portes com pelo menos um fornecedor de sede conhecida no cadastro.
function locatedPortes(suppliers: SupplierAggregate[], locations: Locations): Porte[] {
  return COMPANY_PORTES.filter((porte) => suppliers.some((supplier) => supplier.porte === porte && locations.get(supplier.key)?.uf));
}

// O cadastro cobre os demais portes? Senão, a divisão por localização fica só
// com as ME, em vez de jogar EPP e demais empresas em "não identificada".
const fullLocationCoverage = (portes: Porte[]) => portes.includes("EPP") || portes.includes("DEMAIS");

const NOTE_SEDE_ME_ONLY =
  "O cadastro de sedes da API Compras Abertas cobre hoje apenas as microempresas. Por isso, a divisão por localização mostra só as ME; EPP e demais empresas aparecem na distribuição por estado com todos os portes. Quando a API publicar a sede dos demais portes, esta tabela passa a separá-los automaticamente.";

function locationPorteBlocks(options: {
  dataset: Dataset;
  suppliers: SupplierAggregate[];
  locations: Locations;
  keyOf: (supplier: SupplierAggregate) => string | null;
  firstColumn: string;
  title?: string;
  limit?: number;
  withTotal?: boolean;
  emptyText: string;
  chartTitle?: string;
  // Ordem fixa das linhas (ex.: origem); sem ela, do maior para o menor valor.
  order?: string[];
}): ReportBlock[] {
  const { dataset, locations } = options;
  const sorted = <T extends { label: string }>(rows: T[]) =>
    options.order ? [...rows].sort((a, b) => options.order!.indexOf(a.label) - options.order!.indexOf(b.label)) : rows;
  if (fullLocationCoverage(locatedPortes(options.suppliers, locations))) {
    const groups = sorted(groupBy(options.suppliers, options.keyOf));
    const rows = options.limit ? groups.slice(0, options.limit) : groups;
    const blocks: ReportBlock[] = [
      porteValueTable({
        title: options.title,
        firstColumn: options.firstColumn,
        rows,
        total: options.withTotal === false ? undefined : sumRows(groups),
        showUnclassified: dataset.showUnclassified,
        showSuppliers: true,
        emptyText: options.emptyText,
      }),
    ];
    if (options.chartTitle) blocks.push(compositionChart(options.chartTitle, rows.filter((row) => row.totals.total > 0), dataset.showUnclassified, options.emptyText));
    blocks.push({ kind: "note", text: NOTE_LOCATION });
    return blocks;
  }
  const me = options.suppliers.filter((supplier) => supplier.porte === "ME");
  const meTotal = sumBy(me, (supplier) => supplier.cents);
  const groups = sorted(groupBy(me, options.keyOf));
  const rows = options.limit ? groups.slice(0, options.limit) : groups;
  return [
    {
      kind: "table",
      title: `Microempresas por ${options.firstColumn.charAt(0).toLocaleLowerCase("pt-BR")}${options.firstColumn.slice(1)}`,
      columns: [
        { label: options.firstColumn, width: 2.8 },
        { label: "Microempresas", width: 1.2, align: "right" },
        { label: "Valor pago a ME", width: 1.8, align: "right" },
        { label: "% do valor de ME", width: 1.2, align: "right" },
      ],
      rows: rows.map((row) => [row.label, count(row.suppliers), money(row.totals.ME), pct(share(row.totals.ME, meTotal))]),
      total:
        options.withTotal === false
          ? undefined
          : ["Total", count(sumBy(groups, (row) => row.suppliers)), money(sumBy(groups, (row) => row.totals.ME)), pct(share(sumBy(groups, (row) => row.totals.ME), meTotal))],
      emptyText: options.emptyText,
    },
    { kind: "note", text: `${NOTE_SEDE_ME_ONLY} ${NOTE_LOCATION}` },
  ];
}

// ---------- Metodologia (última seção de todos os modelos) ----------
function methodologySection(dataset: Dataset, extra: string[] = []): ReportSection {
  const { coleta, pendencias, observacao } = dataset.summary;
  const empenhos = [reference(coleta.referencia_empenhos_inicio), reference(coleta.referencia_empenhos_fim)];
  const pagamentos = [reference(coleta.referencia_pagamentos_inicio), reference(coleta.referencia_pagamentos_fim)];
  const mei = (coleta.regra_mei ?? "").trim().toLowerCase();
  const items = [
    `Fonte: Portal da Transparência dos Municípios do TCE-CE, consolidado pela API Compras Abertas (coleta nº ${coleta.coleta_id}${coleta.finalizado_em ? `, concluída em ${formatDateBr(coleta.finalizado_em)}` : ""}).`,
    `Exercício do orçamento: ${dataset.request.year}.${empenhos[0] && empenhos[1] ? ` Empenhos de ${empenhos[0]} a ${empenhos[1]}.` : ""}${pagamentos[0] && pagamentos[1] ? ` Pagamentos de ${pagamentos[0]} a ${pagamentos[1]}.` : ""}`,
    `Órgãos excluídos da apuração: ${coleta.orgaos_excluidos?.length ? coleta.orgaos_excluidos.join(", ") : "nenhum"}.`,
    `Porte da empresa: microempresa (porte 01), empresa de pequeno porte (porte 03) e demais empresas (porte 05), conforme ${coleta.fonte_cadastral || "o cadastro da coleta"}${coleta.referencia_base_cadastral && coleta.referencia_base_cadastral !== "NAO_INFORMADA" ? ` (base de ${coleta.referencia_base_cadastral})` : ""}.`,
    mei === "incluir"
      ? "Microempreendedores individuais (MEI) entram no subtotal de microempresas."
      : mei === "excluir"
        ? "Microempreendedores individuais (MEI) ficam fora do subtotal de microempresas."
        : `Regra para MEI informada pela fonte: ${coleta.regra_mei || "não informada"}.`,
    `Naturezas da despesa analisadas: ${
      dataset.natures.length ? dataset.natures.map((row) => natureLabel(row.codigo_natureza, row.nome_natureza)).join("; ") : "nenhuma no recorte"
    }.`,
    ...extra,
  ];
  const blocks: ReportBlock[] = [
    {
      kind: "paragraph",
      text: "Os valores são pagamentos efetivos da Prefeitura, e não valores licitados ou orçados. Cada fornecedor é classificado pelo porte registrado no cadastro da coleta; pagamentos sem porte identificado aparecem à parte para que os totais fechem com o total pago.",
    },
    { kind: "list", items },
  ];
  if (pendencias?.length) {
    blocks.push({
      kind: "note",
      text: `Pendências registradas na coleta: ${pendencias
        .map((item) => `${item.tipo.toLocaleLowerCase("pt-BR").replace(/_/g, " ")} (${plural(item.quantidade, "registro", "registros")}${item.valor ? `, ${money(toCents(item.valor))}` : ""})`)
        .join("; ")}.`,
    });
  }
  if (coleta.reconciliado === false) {
    blocks.push({ kind: "note", text: "A fonte informa que esta coleta ainda não foi totalmente conciliada: os valores podem mudar em uma nova apuração." });
  }
  if (observacao?.trim()) blocks.push({ kind: "note", text: `Observação da fonte: ${observacao.trim()}` });
  return { title: "Metodologia e fontes", pageBreakBefore: true, blocks };
}

// ---------- Evolução mensal (EPP e demais) ----------
function otherSizesSection(dataset: Dataset, otherSizes: Optional<OtherSizesPaymentsResponse>): ReportSection {
  const title = "Evolução mensal: EPP e demais empresas";
  const description = "Pagamentos a empresas de pequeno porte e às demais empresas em cada mês do ano.";
  if (dataset.request.natureCode) {
    return unavailable(
      title,
      description,
      "A fonte não separa a evolução mensal de EPP e demais empresas por natureza da despesa. Para ver esta seção, gere o relatório com todas as naturezas.",
    );
  }
  if (!otherSizes.ok) return unavailable(title, description, otherSizes.reason);

  const months = MONTHS.map(() => ({ EPP: 0, DEMAIS: 0, payments: 0 }));
  for (const row of otherSizes.value.evolucao_temporal ?? []) {
    const month = row.mes ?? Number(row.periodo?.slice(5, 7));
    const year = row.ano ?? Number(row.periodo?.slice(0, 4));
    const porte = porteOf(row.categoria_porte);
    if (year !== dataset.request.year || !(month >= 1 && month <= 12) || (porte !== "EPP" && porte !== "DEMAIS")) continue;
    months[month - 1][porte] += toCents(row.total_valor);
    months[month - 1].payments += row.quantidade_pagamentos || 0;
  }
  const epp = sumBy(months, (month) => month.EPP);
  const demais = sumBy(months, (month) => month.DEMAIS);
  const payments = sumBy(months, (month) => month.payments);
  const period = otherSizes.value.periodo;
  const coleta = dataset.summary.coleta;
  const paymentsWindow = [reference(coleta.referencia_pagamentos_inicio), reference(coleta.referencia_pagamentos_fim)];

  return {
    title,
    description,
    pageBreakBefore: true,
    blocks: [
      {
        kind: "table",
        columns: [
          { label: "Mês", width: 1.6 },
          { label: "Pagamentos", width: 1.1, align: "right" },
          { label: "EPP (R$)", width: 1.7, align: "right" },
          { label: "Demais (R$)", width: 1.7, align: "right" },
          { label: "Total (R$)", width: 1.7, align: "right" },
          { label: "% EPP", width: 0.9, align: "right" },
        ],
        rows: epp + demais > 0
          ? months.map((month, index) => [
              MONTHS[index],
              count(month.payments),
              amount(month.EPP),
              amount(month.DEMAIS),
              amount(month.EPP + month.DEMAIS),
              pct(share(month.EPP, month.EPP + month.DEMAIS)),
            ])
          : [],
        total: ["Total", count(payments), amount(epp), amount(demais), amount(epp + demais), pct(share(epp, epp + demais))],
        emptyText: "Nenhum pagamento a EPP ou demais empresas no ano.",
      },
      {
        kind: "stacked",
        title: "Divisão entre EPP e demais empresas a cada mês",
        legend: [
          { label: PORTE_SHORT.EPP, tone: PORTE_TONE.EPP },
          { label: PORTE_SHORT.DEMAIS, tone: PORTE_TONE.DEMAIS },
        ],
        items: months.map((month, index) => ({ label: MONTHS[index], segments: [month.EPP, month.DEMAIS], display: money(month.EPP + month.DEMAIS) })),
        emptyText: "Nenhum pagamento a EPP ou demais empresas no ano.",
      },
      {
        kind: "note",
        text: `Esta série usa a data de cada pagamento no ano civil${period?.inicio && period?.fim ? ` (${formatDateBr(period.inicio)} a ${formatDateBr(period.fim)})` : ""}, enquanto o restante do relatório usa o orçamento de ${dataset.request.year}${
          paymentsWindow[0] && paymentsWindow[1] ? ` (pagamentos de ${paymentsWindow[0]} a ${paymentsWindow[1]})` : ""
        }; por isso os totais podem ser diferentes. A fonte não publica a série mensal das microempresas.`,
      },
    ],
  };
}

// ---------- Licitações (modelo de despesas) ----------
const NATURE_BY_NAME = new Map(KNOWN_NATURE_CODES.map((code) => [normalizeCity(natureLabel(code)), code]));

function bidNatures(bid: ApiBid): Array<{ code: string | undefined; label: string }> {
  return (bid.naturezas_despesa ?? []).map((name) => {
    const code = NATURE_BY_NAME.get(normalizeCity(name));
    return { code, label: natureLabel(code, name) };
  });
}

const CLASSIFICATION_LABEL: Record<string, string> = {
  ME: "Microempresas (ME)",
  MEI: "Microempreendedores individuais (MEI)",
  EPP: "Empresas de pequeno porte (EPP)",
  OUTRO: "Demais empresas",
  DESCONHECIDA: "Classificação desconhecida",
};
const CLASSIFICATION_ORDER = Object.keys(CLASSIFICATION_LABEL);

function classificationSection(request: ReportRequest, comparison: Optional<ApiClassificationComparison>): ReportSection {
  const title = "Vencedores das licitações por porte";
  const description = "Valor homologado aos vencedores das licitações realizadas no ano, por classificação de porte.";
  if (request.natureCode) {
    return unavailable(title, description, "A fonte não separa a classificação dos vencedores por natureza da despesa. Para ver esta seção, gere o relatório com todas as naturezas.");
  }
  if (!comparison.ok) return unavailable(title, description, comparison.reason);
  const { universo, por_classificacao: rows } = comparison.value;
  const universe = toCents(universo.valor_total);
  const ordered = [...rows].sort(
    (a, b) => (CLASSIFICATION_ORDER.indexOf(a.classificacao) + 1 || 99) - (CLASSIFICATION_ORDER.indexOf(b.classificacao) + 1 || 99),
  );
  return {
    title,
    description,
    blocks: [
      {
        kind: "table",
        columns: [
          { label: "Classificação do vencedor", width: 3 },
          { label: "Licitações", width: 1, align: "right" },
          { label: "Itens", width: 0.9, align: "right" },
          { label: "Valor vencido", width: 1.8, align: "right" },
          { label: "% do valor", width: 1, align: "right" },
        ],
        rows: ordered.map((row) => [
          CLASSIFICATION_LABEL[row.classificacao] ?? titleCase(row.classificacao.replace(/_/g, " ")),
          count(row.quantidade_licitacoes),
          count(row.quantidade_itens),
          money(toCents(row.valor_total)),
          pct(share(toCents(row.valor_total), universe)),
        ]),
        total: ["Todas as licitações", count(universo.quantidade_licitacoes), count(universo.quantidade_itens), money(universe), pct(universe > 0 ? 100 : null)],
        emptyText: "Nenhum item vencido em licitações do ano.",
      },
      {
        kind: "note",
        text: "Valor vencido é o homologado nas licitações, não o efetivamente pago. Uma licitação com vencedores de portes diferentes é contada em cada classificação; por isso a soma das licitações pode passar do total. A classificação desconhecida inclui itens sem CNPJ ou com cadastro desatualizado.",
      },
    ],
  };
}

function bidSections(request: ReportRequest, bids: Optional<ApiBid[]>): ReportSection[] {
  if (!bids.ok) {
    return [unavailable("Licitações do período", "Licitações realizadas no ano.", bids.reason)];
  }
  const rows = request.natureCode ? bids.value.filter((bid) => bidNatures(bid).some((nature) => nature.code === request.natureCode)) : bids.value;
  const total = sumBy(rows, (bid) => toCents(bid.valor_total_licitacao));
  const months = MONTHS.map(() => ({ cents: 0, bids: 0 }));
  for (const bid of rows) {
    const month = Number(bid.data_realizacao_licitacao?.slice(5, 7));
    if (!(month >= 1 && month <= 12)) continue;
    months[month - 1].cents += toCents(bid.valor_total_licitacao);
    months[month - 1].bids += 1;
  }
  const ordered = [...rows].sort(
    (a, b) => (a.data_realizacao_licitacao ?? "").localeCompare(b.data_realizacao_licitacao ?? "") || a.numero_licitacao.localeCompare(b.numero_licitacao),
  );
  const notes: ReportBlock[] = [];
  if (bids.value.length >= MAX_BIDS) {
    notes.push({ kind: "note", text: `A consulta atingiu o limite de ${count(MAX_BIDS)} licitações; a lista pode estar incompleta.` });
  }
  if (request.natureCode) {
    const withoutNature = bids.value.filter((bid) => !bid.naturezas_despesa?.length).length;
    notes.push({
      kind: "note",
      text: `Recorte por natureza: entram as licitações associadas a "${natureLabel(request.natureCode)}".${
        withoutNature ? ` ${plural(withoutNature, "licitação do ano ainda não tem", "licitações do ano ainda não têm")} natureza associada na fonte e não entram no recorte.` : ""
      }`,
    });
  }
  return [
    {
      title: "Licitações por mês",
      description: "Valor das licitações pelo mês de realização. Mede o valor licitado, não o pago.",
      pageBreakBefore: true,
      blocks: [
        {
          kind: "bars",
          items: months.map((month, index) => ({
            label: `${MONTHS[index]} · ${plural(month.bids, "licitação", "licitações")}`,
            value: month.cents,
            display: money(month.cents),
          })),
          emptyText: "Nenhuma licitação com data de realização no período.",
        },
      ],
    },
    {
      title: "Licitações do período",
      description: "Todas as licitações do ano, em ordem de data de realização.",
      blocks: [
        {
          kind: "table",
          columns: [
            { label: "Licitação", width: 1.55 },
            { label: "Data", width: 1 },
            { label: "Natureza da despesa", width: 3.2 },
            { label: "Empresas", width: 0.95, align: "right" },
            { label: "Itens", width: 0.7, align: "right" },
            { label: "Valor", width: 1.7, align: "right" },
          ],
          rows: ordered.map((bid) => {
            const natures = [...new Set(bidNatures(bid).map((nature) => nature.label))];
            return [
              bid.numero_licitacao,
              formatDateBr(bid.data_realizacao_licitacao),
              natures.length ? natures.join("; ") : "Sem natureza associada",
              count(bid.quantidade_empresas),
              count(bid.quantidade_itens),
              money(toCents(bid.valor_total_licitacao)),
            ];
          }),
          total: ["Total", "", plural(ordered.length, "licitação", "licitações"), "", "", money(total)],
          emptyText: "Nenhuma licitação no período.",
        },
        ...notes,
      ],
    },
  ];
}

// ---------- Modelos ----------
async function generalReport(dataset: Dataset): Promise<ReportSection[]> {
  const { request, totals } = dataset;
  const [directory, otherSizes, states] = await Promise.all([loadDirectory(), loadOtherSizes(request), loadStates(request)]);
  const name = upper(request.municipality.name);
  const cnpjSuppliers = dataset.suppliers.filter((supplier) => supplier.cnpj).length;

  const locations = directory.ok ? locateAll(dataset.suppliers, directory.value, request.municipality.name) : null;
  const geography: ReportSection[] = [
    {
      title: "Fornecedores por estado",
      description: "Valor pago conforme a UF da sede do fornecedor.",
      pageBreakBefore: true,
      blocks: [
        ...stateTotalsBlocks(dataset, states),
        ...(locations
          ? locationPorteBlocks({
              dataset,
              suppliers: dataset.suppliers,
              locations,
              keyOf: (supplier) => locations.get(supplier.key)?.uf ?? "Não identificada",
              firstColumn: "UF da sede",
              title: "Divisão por porte",
              emptyText: "Nenhum fornecedor com sede identificada no recorte.",
            })
          : [{ kind: "note" as const, text: directory.ok ? "" : directory.reason }]),
      ],
    },
    locations
      ? {
          title: "Fornecedores por município do Ceará",
          description: "Valor pago conforme a cidade da sede, só para fornecedores sediados no Ceará.",
          blocks: locationPorteBlocks({
            dataset,
            suppliers: dataset.suppliers,
            locations,
            keyOf: (supplier) => {
              const location = locations.get(supplier.key);
              return location?.uf === "CE" ? (location.city ? titleCase(location.city) : "Cidade não identificada") : null;
            },
            firstColumn: "Município da sede",
            emptyText: "Nenhum fornecedor sediado no Ceará no recorte.",
          }),
        }
      : unavailable("Fornecedores por município do Ceará", "Valor pago conforme a cidade da sede.", directory.ok ? "" : directory.reason),
  ];

  return [
    {
      title: "Apresentação",
      blocks: [
        {
          kind: "paragraph",
          text: "As contratações públicas municipais são um dos principais instrumentos de política econômica do gestor local. Por meio das compras de bens, serviços e obras, o poder público pode fortalecer a produção local, gerar emprego e renda e promover o desenvolvimento econômico do município.",
        },
        {
          kind: "paragraph",
          text: "A Lei Complementar nº 123, de 14 de dezembro de 2006, garante tratamento diferenciado a microempresas e empresas de pequeno porte nas licitações. Comparar quanto cada porte recebe mostra o alcance dessas regras e onde há espaço para ampliar a participação dos pequenos negócios.",
        },
        {
          kind: "paragraph",
          text: `Este relatório traz um diagnóstico das compras públicas de ${name} no orçamento de ${request.year}: o valor pago a microempresas (ME), empresas de pequeno porte (EPP) e demais empresas, por natureza da despesa e pela localização dos fornecedores.`,
        },
      ],
    },
    {
      title: "Indicadores principais",
      description: "Totais pagos no recorte escolhido, por porte de empresa.",
      blocks: [
        {
          kind: "kpis",
          items: [
            totalKpi(dataset),
            mpeKpi(dataset),
            porteKpi(dataset, "ME"),
            porteKpi(dataset, "EPP"),
            porteKpi(dataset, "DEMAIS"),
            { label: "Fornecedores com CNPJ", value: count(cnpjSuppliers), detail: totals.total ? "Empresas que receberam pagamentos no recorte" : "Nenhum pagamento no recorte" },
          ],
        },
        ...natureFilterNote(request),
      ],
    },
    porteComparisonSection(dataset),
    { ...natureValueSection(dataset), pageBreakBefore: true },
    ...geography,
    otherSizesSection(dataset, otherSizes),
    methodologySection(dataset),
  ];
}

async function natureReport(dataset: Dataset): Promise<ReportSection[]> {
  const { request } = dataset;
  const rows = natureRows(dataset);
  const paid = rows.filter((row) => row.totals.total > 0);
  const biggest = paid[0];
  const byMpe = [...paid].sort((a, b) => (share(b.totals.ME + b.totals.EPP, b.totals.total) ?? 0) - (share(a.totals.ME + a.totals.EPP, a.totals.total) ?? 0));
  const byOthers = [...paid].sort((a, b) => (share(b.totals.DEMAIS, b.totals.total) ?? 0) - (share(a.totals.DEMAIS, a.totals.total) ?? 0));
  const portes = dataset.showUnclassified ? PORTES : COMPANY_PORTES;

  // Fornecedores distintos de cada porte em cada natureza.
  const suppliersByNature = new Map<string, Record<Porte, Set<string>>>();
  for (const row of dataset.rows) {
    const entry = suppliersByNature.get(row.codigo_natureza) ?? { ME: new Set<string>(), EPP: new Set<string>(), DEMAIS: new Set<string>(), OUTROS: new Set<string>() };
    entry[porteOf(row.categoria_porte)].add(row.documento);
    suppliersByNature.set(row.codigo_natureza, entry);
  }

  return [
    {
      title: "Indicadores principais",
      description: "Pagamentos do recorte escolhido, por natureza da despesa e porte de empresa.",
      blocks: [
        {
          kind: "kpis",
          items: [
            totalKpi(dataset),
            mpeKpi(dataset),
            { label: "Naturezas com pagamento", value: `${count(paid.length)} de ${count(rows.length)}`, detail: "Naturezas da despesa analisadas" },
            { label: "Natureza com maior valor", value: biggest ? money(biggest.totals.total) : "—", detail: biggest?.label ?? "Nenhum pagamento no recorte" },
            {
              label: "Maior participação de ME + EPP",
              value: byMpe[0] ? pct(share(byMpe[0].totals.ME + byMpe[0].totals.EPP, byMpe[0].totals.total)) : "—",
              detail: byMpe[0]?.label ?? "Nenhum pagamento no recorte",
            },
            {
              label: "Maior participação das demais empresas",
              value: byOthers[0] ? pct(share(byOthers[0].totals.DEMAIS, byOthers[0].totals.total)) : "—",
              detail: byOthers[0]?.label ?? "Nenhum pagamento no recorte",
            },
          ],
        },
        ...natureFilterNote(request),
      ],
    },
    porteComparisonSection(dataset),
    { ...natureValueSection(dataset), pageBreakBefore: true },
    {
      title: "Participação de cada porte por natureza",
      description: "Parte do valor pago em cada natureza que ficou com cada porte.",
      blocks: [
        {
          kind: "table",
          columns: [
            { label: "Natureza da despesa", width: 2.9 },
            ...portes.map((porte) => ({ label: `% ${PORTE_HEADER[porte]}`, width: 1, align: "right" as const })),
            { label: "% ME + EPP", width: 1, align: "right" },
            { label: "Total pago", width: 1.7, align: "right" },
          ],
          rows: rows.map((row) => [
            row.label,
            ...portes.map((porte) => pct(share(row.totals[porte], row.totals.total))),
            pct(share(row.totals.ME + row.totals.EPP, row.totals.total)),
            money(row.totals.total),
          ]),
          total: [
            "Total",
            ...portes.map((porte) => pct(share(dataset.totals[porte], dataset.totals.total))),
            pct(share(dataset.totals.ME + dataset.totals.EPP, dataset.totals.total)),
            money(dataset.totals.total),
          ],
          emptyText: "Nenhum pagamento nas naturezas do recorte.",
        },
      ],
    },
    {
      title: "Fornecedores por natureza e porte",
      description: "Quantas empresas de cada porte receberam pagamentos em cada natureza.",
      blocks: [
        {
          kind: "table",
          columns: [
            { label: "Natureza da despesa", width: 3 },
            ...portes.map((porte) => ({ label: PORTE_HEADER[porte], width: 0.95, align: "right" as const })),
            { label: "Fornecedores", width: 1.1, align: "right" },
            { label: "Pagamentos", width: 1.1, align: "right" },
          ],
          rows: dataset.natures.map((row) => {
            const entry = suppliersByNature.get(row.codigo_natureza);
            return [
              natureLabel(row.codigo_natureza, row.nome_natureza),
              ...portes.map((porte) => count(entry?.[porte].size ?? 0)),
              count(entry ? sumBy(PORTES, (porte) => entry[porte].size) : 0),
              count(row.quantidade_pagamentos || 0),
            ];
          }),
          total: [
            "Fornecedores distintos",
            ...portes.map((porte) => count(dataset.stats[porte].suppliers)),
            count(dataset.suppliers.length),
            count(dataset.payments),
          ],
          emptyText: "Nenhum pagamento nas naturezas do recorte.",
        },
        {
          kind: "note",
          text: "Um fornecedor que recebeu em mais de uma natureza é contado em cada uma delas; por isso, a linha final traz os fornecedores distintos, e não a soma das linhas.",
        },
      ],
    },
    {
      title: "Distribuição do valor pago",
      description: "Valor pago em cada natureza da despesa, somando todos os portes.",
      blocks: [
        {
          kind: "bars",
          items: paid.map((row) => ({ label: row.label, value: row.totals.total, display: money(row.totals.total) })),
          emptyText: "Nenhum pagamento nas naturezas do recorte.",
        },
      ],
    },
    methodologySection(dataset),
  ];
}

async function supplierReport(dataset: Dataset): Promise<ReportSection[]> {
  const { request, totals } = dataset;
  const [directory, states] = await Promise.all([loadDirectory(), loadStates(request)]);
  const companies = dataset.suppliers.filter((supplier) => supplier.cnpj);
  const others = dataset.suppliers.filter((supplier) => !supplier.cnpj);
  const companyTotal = sumBy(companies, (supplier) => supplier.cents);
  const topFive = share(sumBy(companies.slice(0, 5), (supplier) => supplier.cents), companyTotal);
  const biggest = companies[0];
  const locations = directory.ok ? locateAll(companies, directory.value, request.municipality.name) : null;
  const fullCoverage = locations ? fullLocationCoverage(locatedPortes(companies, locations)) : false;
  // Sem a sede dos demais portes, "do município" só pode contar as ME.
  const localPool = fullCoverage ? companies : companies.filter((supplier) => supplier.porte === "ME");
  const local = locations ? localPool.filter((supplier) => locations.get(supplier.key)?.origin === "local") : [];
  const localTotal = sumBy(local, (supplier) => supplier.cents);
  const localBase = sumBy(localPool, (supplier) => supplier.cents);
  const companyPortes = dataset.showUnclassified ? PORTES : COMPANY_PORTES;

  const kpis: ReportKpi[] = [
    {
      label: "Fornecedores com CNPJ",
      value: count(companies.length),
      detail: COMPANY_PORTES.map((porte) => `${count(dataset.stats[porte].suppliers)} ${PORTE_SHORT[porte]}`).join(" · "),
    },
    { label: "Valor pago a empresas", value: money(companyTotal), detail: `${pct(share(companyTotal, totals.total))} do total pago` },
    { label: "Valor médio por fornecedor", value: companies.length ? money(companyTotal / companies.length) : "—", detail: "Valor pago dividido pelo nº de empresas" },
    { label: "Concentração nas 5 maiores", value: pct(topFive), detail: "Parte do valor pago a empresas que ficou com as 5 maiores" },
    {
      label: "Maior fornecedor",
      value: biggest ? money(biggest.cents) : "—",
      detail: biggest ? `${titleCase(biggest.name)} (${PORTE_SHORT[biggest.porte]})` : "Nenhuma empresa no recorte",
    },
    locations
      ? {
          label: fullCoverage ? "Fornecedores do município" : "Microempresas do município",
          value: count(local.length),
          detail: `${money(localTotal)} (${pct(share(localTotal, localBase))} do valor pago ${fullCoverage ? "a empresas" : "a ME"})`,
        }
      : { label: "Fornecedores do município", value: "—", detail: "Cadastro de empresas indisponível agora" },
  ];

  // Destaques: as maiores empresas de cada porte.
  const topByPorte = COMPANY_PORTES.flatMap((porte) => companies.filter((supplier) => supplier.porte === porte).slice(0, 5));

  const originSections: ReportSection[] = [];
  if (locations) {
    originSections.push(
      {
        title: "Origem dos fornecedores",
        description: "Onde ficam as empresas que receberam pagamentos, pelo endereço do cadastro.",
        pageBreakBefore: true,
        blocks: [
          ...locationPorteBlocks({
            dataset,
            suppliers: companies,
            locations,
            keyOf: (supplier) => ORIGIN_LABEL[locations.get(supplier.key)?.origin ?? "unknown"],
            order: ORIGINS.map((origin) => ORIGIN_LABEL[origin]),
            firstColumn: "Origem",
            title: "Por origem",
            chartTitle: "Composição do valor pago por origem",
            emptyText: "Nenhuma empresa recebeu pagamentos no recorte.",
          }),
          ...stateTotalsBlocks(dataset, states),
        ],
      },
      {
        title: "Cidades com maior valor pago",
        description: fullCoverage ? "As 15 cidades-sede que mais receberam, com a divisão por porte." : "As 15 cidades-sede que mais receberam pagamentos de microempresas.",
        blocks: locationPorteBlocks({
          dataset,
          suppliers: companies,
          locations,
          keyOf: (supplier) => {
            const location = locations.get(supplier.key);
            return location?.city ? `${titleCase(location.city)}${location.uf ? `/${location.uf}` : ""}` : null;
          },
          firstColumn: "Cidade/UF",
          limit: 15,
          withTotal: false,
          emptyText: "Nenhum fornecedor com cidade identificada no cadastro.",
        }),
      },
    );
  } else {
    originSections.push({
      title: "Origem dos fornecedores",
      description: "Onde ficam as empresas que receberam pagamentos.",
      pageBreakBefore: true,
      blocks: [{ kind: "note", text: directory.ok ? "" : directory.reason }, ...stateTotalsBlocks(dataset, states)],
    });
  }

  const listNotes: ReportBlock[] = [];
  if (locations && !fullCoverage) {
    listNotes.push({ kind: "note", text: "Cidade/UF: o cadastro de sedes da API cobre hoje apenas as microempresas; para EPP e demais empresas a sede aparece como não informada." });
  }
  if (others.length) {
    listNotes.push({
      kind: "note",
      text: `${plural(others.length, "favorecido sem CNPJ válido recebeu", "favorecidos sem CNPJ válido receberam")} ${money(sumBy(others, (supplier) => supplier.cents))} no recorte. Eles entram nos totais por porte, mas não são listados nominalmente.`,
    });
  }

  return [
    {
      title: "Indicadores principais",
      description: "Empresas que receberam pagamentos da Prefeitura no recorte escolhido.",
      blocks: [{ kind: "kpis", items: kpis }, ...natureFilterNote(request)],
    },
    porteComparisonSection(dataset),
    {
      title: "Maiores fornecedores de cada porte",
      description: "As cinco empresas que mais receberam em cada porte.",
      pageBreakBefore: true,
      blocks: [
        {
          kind: "table",
          columns: [
            { label: "Porte", width: 0.85 },
            { label: "Empresa", width: 3 },
            { label: "CNPJ", width: 1.75 },
            { label: "Pagamentos", width: 0.95, align: "right" },
            { label: "Valor pago", width: 1.6, align: "right" },
            { label: "% do porte", width: 0.95, align: "right" },
          ],
          rows: topByPorte.map((supplier) => [
            PORTE_SHORT[supplier.porte],
            titleCase(supplier.name),
            formatCnpj(supplier.cnpj),
            count(supplier.payments),
            money(supplier.cents),
            pct(share(supplier.cents, dataset.stats[supplier.porte].cents)),
          ]),
          emptyText: "Nenhuma empresa recebeu pagamentos no recorte.",
        },
      ],
    },
    ...originSections,
    {
      title: "Lista de fornecedores",
      description: "Todas as empresas que receberam pagamentos, do maior para o menor valor, com o porte de cada uma.",
      pageBreakBefore: true,
      blocks: [
        {
          kind: "table",
          columns: [
            { label: "Nº", width: 0.45, align: "right" },
            { label: "Empresa", width: 2.55 },
            { label: "CNPJ", width: 1.7 },
            { label: "Porte", width: companyPortes.length > 3 ? 0.95 : 0.75 },
            { label: "Cidade/UF", width: 1.45 },
            { label: "Pagam.", width: 0.75, align: "right" },
            { label: "Valor pago", width: 1.5, align: "right" },
            { label: "%", width: 0.7, align: "right" },
          ],
          rows: companies.map((supplier, index) => {
            const location = locations?.get(supplier.key);
            return [
              String(index + 1),
              titleCase(supplier.name),
              formatCnpj(supplier.cnpj),
              PORTE_SHORT[supplier.porte],
              location?.city ? `${titleCase(location.city)}${location.uf ? `/${location.uf}` : ""}` : locations ? "Não informada" : "—",
              count(supplier.payments),
              money(supplier.cents),
              pct(share(supplier.cents, companyTotal)),
            ];
          }),
          total: ["", "Total", "", "", "", count(sumBy(companies, (supplier) => supplier.payments)), money(companyTotal), pct(companyTotal > 0 ? 100 : null)],
          emptyText: "Nenhuma empresa recebeu pagamentos no recorte.",
        },
        ...listNotes,
      ],
    },
    methodologySection(dataset),
  ];
}

async function expenseReport(dataset: Dataset): Promise<ReportSection[]> {
  const { request, totals } = dataset;
  const [otherSizes, comparison, bids] = await Promise.all([
    loadOtherSizes(request),
    optional("a classificação dos vencedores das licitações", () => loadClassificationComparison(request.municipality.tceCode, request.year)),
    optional("as licitações do período", () => loadBids(request.municipality.tceCode, request.year)),
  ]);
  const rows = natureRows(dataset);
  const paid = rows.filter((row) => row.totals.total > 0);
  const filteredBids = bids.ok && request.natureCode ? bids.value.filter((bid) => bidNatures(bid).some((nature) => nature.code === request.natureCode)) : bids.ok ? bids.value : null;
  const bidsTotal = filteredBids ? sumBy(filteredBids, (bid) => toCents(bid.valor_total_licitacao)) : 0;

  return [
    {
      title: "Indicadores principais",
      description: "Despesas pagas e licitações do município no recorte escolhido.",
      blocks: [
        {
          kind: "kpis",
          items: [
            totalKpi(dataset),
            mpeKpi(dataset),
            { label: "Valor médio por pagamento", value: dataset.payments ? money(totals.total / dataset.payments) : "—", detail: "Total pago dividido pelo nº de pagamentos" },
            { label: "Natureza com maior valor", value: paid[0] ? money(paid[0].totals.total) : "—", detail: paid[0]?.label ?? "Nenhum pagamento no recorte" },
            {
              label: "Licitações no período",
              value: filteredBids ? count(filteredBids.length) : "—",
              detail: filteredBids ? "Com data de realização no ano" : "Licitações indisponíveis agora",
            },
            { label: "Valor das licitações", value: filteredBids ? money(bidsTotal) : "—", detail: "Valor licitado, não o pago" },
          ],
        },
        ...natureFilterNote(request),
      ],
    },
    porteComparisonSection(dataset),
    {
      title: "Pagamentos por natureza da despesa",
      description: "Valor pago e número de pagamentos em cada natureza.",
      pageBreakBefore: true,
      blocks: [
        {
          kind: "table",
          columns: [
            { label: "Natureza da despesa", width: 3.4 },
            { label: "Pagamentos", width: 1.05, align: "right" },
            { label: "Valor pago", width: 1.8, align: "right" },
            { label: "% do total", width: 1, align: "right" },
            { label: "% ME + EPP", width: 1, align: "right" },
          ],
          rows: dataset.natures.map((row) => {
            const values = natureTotals(row);
            return [
              natureLabel(row.codigo_natureza, row.nome_natureza),
              count(row.quantidade_pagamentos || 0),
              money(values.total),
              pct(share(values.total, totals.total)),
              pct(share(values.ME + values.EPP, values.total)),
            ];
          }),
          total: ["Total", count(dataset.payments), money(totals.total), pct(totals.total > 0 ? 100 : null), pct(share(totals.ME + totals.EPP, totals.total))],
          emptyText: "Nenhum pagamento nas naturezas do recorte.",
        },
        compositionChart("Composição do valor pago por natureza", paid, dataset.showUnclassified, "Nenhum pagamento nas naturezas do recorte."),
        { kind: "note", text: NOTE_VALUES },
      ],
    },
    otherSizesSection(dataset, otherSizes),
    classificationSection(request, comparison),
    ...bidSections(request, bids),
    methodologySection(dataset, [
      "Licitações: data de realização no ano civil e valor total licitado, pela API Compras Abertas. Valor licitado e valor vencido não equivalem a pagamento.",
    ]),
  ];
}

const BUILDERS: Record<ReportRequest["model"], (dataset: Dataset) => Promise<ReportSection[]>> = {
  geral: generalReport,
  natureza: natureReport,
  fornecedores: supplierReport,
  despesas: expenseReport,
};

function periodLabel(dataset: Dataset): string {
  const { coleta } = dataset.summary;
  const start = reference(coleta.referencia_pagamentos_inicio);
  const end = reference(coleta.referencia_pagamentos_fim);
  return start && end ? `Orçamento ${dataset.request.year} · pagamentos de ${start} a ${end}` : `Orçamento ${dataset.request.year}`;
}

export async function buildGestorReport(request: ReportRequest): Promise<ReportDocument> {
  const model = reportModel(request.model);
  try {
    const dataset = await loadDataset(request);
    const sections = await BUILDERS[request.model](dataset);
    return {
      model: request.model,
      title: model.title,
      summary: model.description,
      municipality: request.municipality.name,
      state: "CE",
      year: request.year,
      period: periodLabel(dataset),
      nature: request.natureCode ? natureLabel(request.natureCode) : "Todas as naturezas",
      generatedAt: new Date().toISOString(),
      source: SOURCE,
      sections,
    };
  } catch (error) {
    if (error instanceof InvalidAmountError) {
      console.error("Relatório do gestor: valor inválido na fonte", error);
      throw new ReportDataError("A fonte devolveu um valor em formato inesperado. Avise a equipe do Compras Abertas.");
    }
    throw error;
  }
}
