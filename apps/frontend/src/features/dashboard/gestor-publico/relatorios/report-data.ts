// Sem "use client": monta o relatório no servidor, só com dados reais.
//
// Fontes (todas do TCE-CE, pela API Compra Aberta):
// - participações gerais de ME: resumo do período (valor vencido por todas as
//   empresas e pelas microempresas) e a lista de microempresas vencedoras,
//   com cidade e UF. A fonte identifica empresa por empresa só as ME;
// - participações locais de ME: resumo do valor que ficou com ME da cidade;
// - gastos e participação por natureza da despesa (dotações);
// - licitações do ano, com as naturezas de cada uma.
// O filtro de natureza vai direto para a API quando a rota aceita; nas
// demais, as linhas são filtradas aqui pelo código ou pelo nome oficial.

import { loadBids, type ApiBid } from "@/features/dashboard/gestor/gestor-api";
import { formatDateBr, normalizeCity } from "@/features/dashboard/gestor/gestor-domain";
import { formatCnpj } from "@/features/public-data/format";
import { KNOWN_NATURE_CODES, natureLabel, titleCase } from "@/features/public-data/plain-language";
import { listExpensesByNatureService } from "@/services/analytics/list-expenses-by-nature.service";
import { listGeneralParticipationsService } from "@/services/analytics/list-general-participations.service";
import { listLocalParticipationsService } from "@/services/analytics/list-local-participations.service";
import { listParticipationByNatureService } from "@/services/analytics/list-participation-by-nature.service";
import type {
  ExpensesByNatureResponse,
  GeneralParticipationsResponse,
  LocalParticipation,
  ParticipationByNatureResponse,
} from "@/services/analytics/analytics.types";
import type { MunicipalityOption } from "@/services/municipalities/municipalities.types";
import { reportModel, type ReportModelId } from "./report-catalog";
import type { ReportBlock, ReportDocument, ReportKpi, ReportSection } from "./report-document";

export interface ReportRequest {
  model: Exclude<ReportModelId, "receitas">;
  municipality: MunicipalityOption;
  year: number;
  natureCode?: string;
}

// Mensagem pronta para mostrar ao gestor.
export class ReportDataError extends Error {}

const SOURCE = "Tribunal de Contas do Estado do Ceará (TCE-CE), pela API Compra Aberta";
const PAGE_SIZE = 100;
const MAX_PAGES = 200;
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// ---------- Formatação ----------
// O Intl separa "R$" do número com espaço não separável; troca por espaço
// comum para todos os formatos de arquivo desenharem igual.
const moneyFormat = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (value: number) => moneyFormat.format(value).replace(/\s/g, " ");
const count = (value: number) => value.toLocaleString("pt-BR");
const pct = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? "—" : `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const shareOf = (part: number, total: number) => (total > 0 ? (part / total) * 100 : null);
const toNumber = (value: string | number | null | undefined) => Number(value) || 0;
const plural = (value: number, one: string, many: string) => `${count(value)} ${value === 1 ? one : many}`;

// ---------- Naturezas ----------
// As licitações trazem o nome oficial da natureza (ex.: "OUTROS SERVIÇOS DE
// TERCEIROS – PESSOA JURÍDICA"); sem acento, pontuação e caixa, ele bate com
// o rótulo do código.
const normalizeName = normalizeCity;
const NATURE_BY_NAME = new Map(KNOWN_NATURE_CODES.map((code) => [normalizeName(natureLabel(code)), code]));

function bidNatures(bid: ApiBid): Array<{ code: string | undefined; label: string }> {
  return (bid.naturezas_despesa ?? []).map((name) => {
    const code = NATURE_BY_NAME.get(normalizeName(name));
    return { code, label: natureLabel(code, name) };
  });
}

function onlyNature<T extends { codigo_natureza: string }>(rows: T[], natureCode?: string): T[] {
  return natureCode ? rows.filter((row) => row.codigo_natureza === natureCode) : rows;
}

// ---------- Carregamento ----------
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A API fica no Render e às vezes demora a acordar: tenta de novo uma vez
// antes de desistir.
async function withRetry<T>(what: string, load: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await load();
    } catch {
      if (attempt >= 2) throw new ReportDataError(`Não foi possível carregar ${what} agora. Tente novamente em instantes.`);
      await wait(1_000);
    }
  }
}

type MeSummary = GeneralParticipationsResponse["resumo"];
type ExpenseRow = ExpensesByNatureResponse["data"][number];
type NatureParticipationRow = ParticipationByNatureResponse["data"][number];

async function loadMeParticipations(tceCode: string, year: number, natureCode?: string): Promise<{ summary: MeSummary; rows: LocalParticipation[] }> {
  const query = { codigo_municipio: tceCode, ano: year, codigo_natureza: natureCode, limit: PAGE_SIZE };
  const first = await listGeneralParticipationsService({ ...query, offset: 0 });
  const rows = [...first.data];
  let page = 1;
  let full = first.data.length === PAGE_SIZE;
  while (full && page < MAX_PAGES) {
    const batch = await Promise.all(
      Array.from({ length: 4 }, (_, index) => listGeneralParticipationsService({ ...query, offset: (page + index) * PAGE_SIZE })),
    );
    for (const next of batch) {
      rows.push(...next.data);
      if (next.data.length < PAGE_SIZE) {
        full = false;
        break;
      }
    }
    page += batch.length;
  }
  return { summary: first.resumo, rows };
}

// Cada fonte é buscada uma vez por relatório, e só se o modelo usar.
function reportSources({ municipality, year, natureCode }: ReportRequest) {
  const tceCode = municipality.tceCode;
  const period = { codigo_municipio: tceCode, data_inicio: `${year}-01-01`, data_fim: `${year}-12-31` };
  const once = <T>(load: () => Promise<T>) => {
    let promise: Promise<T> | null = null;
    return () => (promise ??= load());
  };

  return {
    meParticipations: once(() => withRetry("as participações das microempresas", () => loadMeParticipations(tceCode, year, natureCode))),
    meSummary: once(() =>
      withRetry("o resumo das participações", () =>
        listGeneralParticipationsService({ codigo_municipio: tceCode, ano: year, codigo_natureza: natureCode, limit: 1 }).then((response) => response.resumo),
      ),
    ),
    localSummary: once(() =>
      withRetry("as participações das microempresas locais", () =>
        listLocalParticipationsService({ codigo_municipio: tceCode, ano: year, codigo_natureza: natureCode, limit: 1 }).then((response) => response.resumo),
      ),
    ),
    expenses: once(() =>
      withRetry("a dotação por natureza da despesa", () => listExpensesByNatureService(period).then((response) => onlyNature(response.data, natureCode))),
    ),
    byNature: once(() =>
      withRetry("a participação por natureza da despesa", () =>
        listParticipationByNatureService(period).then((response) => onlyNature(response.data, natureCode)),
      ),
    ),
    bids: once(() =>
      withRetry("as licitações do período", () =>
        loadBids(tceCode, year).then((rows) =>
          natureCode ? rows.filter((bid) => bidNatures(bid).some((nature) => nature.code === natureCode)) : rows,
        ),
      ),
    ),
  };
}

type Sources = ReturnType<typeof reportSources>;

// ---------- Cálculos ----------
type Origin = "local" | "state" | "other" | "unknown";

const ORIGIN_LABEL: Record<Origin, string> = {
  local: "Do próprio município",
  state: "De outros municípios do Ceará",
  other: "De outros estados",
  unknown: "Cidade não informada",
};

interface Supplier {
  cnpj: string;
  name: string;
  city: string | null;
  origin: Origin;
  bids: Set<string>;
  total: number;
}

function originOf(row: LocalParticipation, municipalityName: string): Origin {
  if (!row.municipio_empresa) return "unknown";
  if (row.uf_empresa !== "CE") return "other";
  return normalizeName(row.municipio_empresa) === normalizeName(municipalityName) ? "local" : "state";
}

// Uma linha por empresa, do maior para o menor valor vencido.
function groupSuppliers(rows: LocalParticipation[], municipalityName: string): Supplier[] {
  const byCnpj = new Map<string, Supplier>();
  for (const row of rows) {
    const supplier = byCnpj.get(row.cnpj) ?? {
      cnpj: row.cnpj,
      name: titleCase(row.empresa ?? "Empresa não informada"),
      city: row.municipio_empresa ? `${titleCase(row.municipio_empresa)}${row.uf_empresa ? `/${row.uf_empresa}` : ""}` : null,
      origin: originOf(row, municipalityName),
      bids: new Set<string>(),
      total: 0,
    };
    supplier.bids.add(row.numero_licitacao);
    supplier.total += toNumber(row.valor_total_vencido);
    byCnpj.set(row.cnpj, supplier);
  }
  return [...byCnpj.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "pt-BR"));
}

const sumBy = <T>(rows: T[], value: (row: T) => number) => rows.reduce((total, row) => total + value(row), 0);

// ---------- Blocos reutilizados pelos modelos ----------
const NOTE_DOTATION = "Dotação é o valor do orçamento associado às contratações. Não representa pagamento efetivo.";
const NOTE_MULTI_NATURE =
  "Uma licitação com mais de uma natureza da despesa é contada em cada uma delas; por isso, a soma das linhas pode ser maior que o total do período.";
const NOTE_ME_ONLY =
  "A fonte identifica empresa por empresa apenas as microempresas vencedoras. As demais empresas entram somente nos totais do período.";

function natureParticipationTable(rows: NatureParticipationRow[]): ReportBlock {
  return {
    kind: "table",
    columns: [
      { label: "Natureza da despesa", width: 3.1 },
      { label: "Licitações", width: 1, align: "right" },
      { label: "Com ME", width: 0.9, align: "right" },
      { label: "Valor vencido", width: 1.75, align: "right" },
      { label: "Valor com ME", width: 1.75, align: "right" },
      { label: "% ME", width: 0.95, align: "right" },
    ],
    rows: [...rows]
      .sort((a, b) => toNumber(b.valor_vencido) - toNumber(a.valor_vencido))
      .map((row) => [
        natureLabel(row.codigo_natureza, row.nome_natureza),
        count(row.quantidade_licitacoes),
        count(row.licitacoes_com_me),
        money(toNumber(row.valor_vencido)),
        money(toNumber(row.valor_vencido_me)),
        pct(row.percentual_valor_vencido_me),
      ]),
    emptyText: "Nenhuma licitação com natureza da despesa no período.",
  };
}

function dotationTable(rows: ExpenseRow[]): ReportBlock {
  const total = sumBy(rows, (row) => toNumber(row.valor_total_dotacao));
  return {
    kind: "table",
    columns: [
      { label: "Natureza da despesa", width: 3.4 },
      { label: "Dotações", width: 1, align: "right" },
      { label: "Licitações", width: 1, align: "right" },
      { label: "Valor da dotação", width: 1.9, align: "right" },
      { label: "% do total", width: 1.1, align: "right" },
    ],
    rows: [...rows]
      .sort((a, b) => toNumber(b.valor_total_dotacao) - toNumber(a.valor_total_dotacao))
      .map((row) => [
        natureLabel(row.codigo_natureza, row.nome_natureza),
        count(row.quantidade_dotacoes),
        count(row.quantidade_licitacoes),
        money(toNumber(row.valor_total_dotacao)),
        pct(shareOf(toNumber(row.valor_total_dotacao), total)),
      ]),
    total: rows.length
      ? ["Total", count(sumBy(rows, (row) => row.quantidade_dotacoes)), "", money(total), pct(total > 0 ? 100 : null)]
      : undefined,
    emptyText: "Nenhuma dotação associada às licitações do período.",
  };
}

function dotationBars(rows: ExpenseRow[]): ReportBlock {
  return {
    kind: "bars",
    title: "Distribuição da dotação",
    items: [...rows]
      .sort((a, b) => toNumber(b.valor_total_dotacao) - toNumber(a.valor_total_dotacao))
      .map((row) => ({
        label: natureLabel(row.codigo_natureza, row.nome_natureza),
        value: toNumber(row.valor_total_dotacao),
        display: money(toNumber(row.valor_total_dotacao)),
      })),
    emptyText: "Nenhuma dotação associada às licitações do período.",
  };
}

function monthlyBars(bids: ApiBid[]): ReportBlock {
  const months = MONTHS.map(() => ({ value: 0, bids: 0 }));
  for (const bid of bids) {
    const month = Number(bid.data_realizacao_licitacao?.slice(5, 7));
    if (month < 1 || month > 12) continue;
    months[month - 1].value += toNumber(bid.valor_total_licitacao);
    months[month - 1].bids += 1;
  }
  return {
    kind: "bars",
    items: months.map((month, index) => ({
      label: `${MONTHS[index]} · ${plural(month.bids, "licitação", "licitações")}`,
      value: month.value,
      display: money(month.value),
    })),
    emptyText: "Nenhuma licitação com data de realização no período.",
  };
}

function supplierRankTable(suppliers: Supplier[], total: number, limit?: number): ReportBlock {
  const rows = limit ? suppliers.slice(0, limit) : suppliers;
  return {
    kind: "table",
    columns: [
      { label: "Nº", width: 0.5, align: "right" },
      { label: "Empresa", width: 2.85 },
      { label: "CNPJ", width: 1.75 },
      { label: "Cidade/UF", width: 1.5 },
      { label: "Licitações", width: 0.95, align: "right" },
      { label: "Valor vencido", width: 1.65, align: "right" },
      { label: "% do valor", width: 1.25, align: "right" },
    ],
    rows: rows.map((supplier, index) => [
      String(index + 1),
      supplier.name,
      formatCnpj(supplier.cnpj),
      supplier.city ?? "Não informada",
      count(supplier.bids.size),
      money(supplier.total),
      pct(shareOf(supplier.total, total)),
    ]),
    total: !limit && rows.length ? ["", "Total", "", "", "", money(total), pct(total > 0 ? 100 : null)] : undefined,
    emptyText: "Nenhuma microempresa venceu licitações no período.",
  };
}

function natureNote(request: ReportRequest): ReportBlock[] {
  return request.natureCode
    ? [{ kind: "note", text: `Recorte por natureza da despesa: entram apenas as licitações associadas a "${natureLabel(request.natureCode)}".` }]
    : [];
}

// ---------- Modelos ----------
async function generalReport(request: ReportRequest, sources: Sources): Promise<ReportSection[]> {
  const [me, local, expenses, byNature, bids] = await Promise.all([
    sources.meParticipations(),
    sources.localSummary(),
    sources.expenses(),
    sources.byNature(),
    sources.bids(),
  ]);
  const suppliers = groupSuppliers(me.rows, request.municipality.name);
  const meTotal = sumBy(suppliers, (supplier) => supplier.total);
  const bidsTotal = sumBy(bids, (bid) => toNumber(bid.valor_total_licitacao));

  const kpis: ReportKpi[] = [
    { label: "Licitações no período", value: count(bids.length), detail: `Valor total de ${money(bidsTotal)}` },
    { label: "Valor vencido", value: money(toNumber(me.summary.valor_total_vencido)), detail: "Homologado às empresas vencedoras" },
    { label: "Valor com microempresas", value: money(toNumber(me.summary.valor_vencido_me)), detail: `${pct(me.summary.percentual_valor_vencido_me)} do valor vencido` },
    {
      label: "Microempresas vencedoras",
      value: count(suppliers.length),
      detail: `${plural(me.summary.participacoes_me, "vitória", "vitórias")} em ${plural(me.summary.licitacoes_com_me, "licitação", "licitações")}`,
    },
    {
      label: "Valor com microempresas locais",
      value: money(toNumber(local.valor_vencido_me_local)),
      detail: `${pct(local.percentual_valor_vencido_me_local)} do valor vencido`,
    },
    {
      label: "Dotação associada",
      value: money(sumBy(expenses, (row) => toNumber(row.valor_total_dotacao))),
      detail: plural(sumBy(expenses, (row) => row.quantidade_dotacoes), "dotação", "dotações"),
    },
  ];

  return [
    { title: "Indicadores principais", description: "Resumo das compras públicas do município no período.", blocks: [{ kind: "kpis", items: kpis }, ...natureNote(request)] },
    {
      title: "Natureza da despesa",
      description: "Valor vencido e participação das microempresas em cada natureza da despesa.",
      blocks: [natureParticipationTable(byNature), { kind: "note", text: NOTE_MULTI_NATURE }],
    },
    { title: "Evolução mensal", description: "Valor das licitações por mês de realização.", blocks: [monthlyBars(bids)] },
    {
      title: "Principais microempresas vencedoras",
      description: "As 10 microempresas com maior valor vencido no período.",
      blocks: [supplierRankTable(suppliers, meTotal, 10), { kind: "note", text: NOTE_ME_ONLY }],
    },
  ];
}

async function natureReport(request: ReportRequest, sources: Sources): Promise<ReportSection[]> {
  const [summary, expenses, byNature] = await Promise.all([sources.meSummary(), sources.expenses(), sources.byNature()]);
  const kpis: ReportKpi[] = [
    {
      label: "Dotação associada",
      value: money(sumBy(expenses, (row) => toNumber(row.valor_total_dotacao))),
      detail: plural(sumBy(expenses, (row) => row.quantidade_dotacoes), "dotação", "dotações"),
    },
    { label: "Valor vencido", value: money(toNumber(summary.valor_total_vencido)), detail: "Homologado às empresas vencedoras" },
    { label: "Valor com microempresas", value: money(toNumber(summary.valor_vencido_me)), detail: `${pct(summary.percentual_valor_vencido_me)} do valor vencido` },
    {
      label: "Licitações com microempresa",
      value: count(summary.licitacoes_com_me),
      detail: `${pct(summary.percentual_licitacoes_com_me)} de ${plural(summary.total_licitacoes, "licitação", "licitações")}`,
    },
    {
      label: "Vitórias de microempresas",
      value: count(summary.participacoes_me),
      detail: `${pct(summary.percentual_participacoes_me)} de ${plural(summary.total_participacoes, "vitória", "vitórias")}`,
    },
    {
      label: "Itens vencidos por microempresas",
      value: count(summary.itens_vencidos_me),
      detail: `${pct(summary.percentual_itens_vencidos_me)} de ${plural(summary.itens_vencidos, "item", "itens")}`,
    },
  ];

  return [
    { title: "Indicadores principais", description: "Totais do período no recorte escolhido.", blocks: [{ kind: "kpis", items: kpis }, ...natureNote(request)] },
    {
      title: "Participação das microempresas por natureza",
      description: "Licitações, valor vencido e parte do valor que ficou com microempresas (ME).",
      blocks: [natureParticipationTable(byNature), { kind: "note", text: NOTE_MULTI_NATURE }],
    },
    {
      title: "Dotação por natureza da despesa",
      description: "Valor do orçamento associado às licitações de cada natureza.",
      blocks: [dotationTable(expenses), dotationBars(expenses), { kind: "note", text: NOTE_DOTATION }],
    },
  ];
}

async function supplierReport(request: ReportRequest, sources: Sources): Promise<ReportSection[]> {
  const me = await sources.meParticipations();
  const suppliers = groupSuppliers(me.rows, request.municipality.name);
  const total = sumBy(suppliers, (supplier) => supplier.total);
  const local = suppliers.filter((supplier) => supplier.origin === "local");
  const localTotal = sumBy(local, (supplier) => supplier.total);
  const topFiveShare = shareOf(sumBy(suppliers.slice(0, 5), (supplier) => supplier.total), total);
  const biggest = suppliers[0];

  const kpis: ReportKpi[] = [
    {
      label: "Microempresas vencedoras",
      value: count(suppliers.length),
      detail: `${plural(me.summary.participacoes_me, "vitória", "vitórias")} em ${plural(me.summary.licitacoes_com_me, "licitação", "licitações")}`,
    },
    { label: "Valor com microempresas", value: money(total), detail: `${pct(me.summary.percentual_valor_vencido_me)} do valor vencido no período` },
    { label: "Microempresas do município", value: count(local.length), detail: `${money(localTotal)} (${pct(shareOf(localTotal, total))} do valor com ME)` },
    { label: "Valor médio por empresa", value: money(suppliers.length ? total / suppliers.length : 0), detail: "Valor com ME dividido pelo nº de empresas" },
    { label: "Concentração nas 5 maiores", value: pct(topFiveShare), detail: "Parte do valor com ME que ficou com as 5 maiores" },
    { label: "Maior valor vencido", value: biggest ? money(biggest.total) : "—", detail: biggest?.name ?? "Nenhuma empresa no período" },
  ];

  const origins = (Object.keys(ORIGIN_LABEL) as Origin[])
    .map((origin) => {
      const group = suppliers.filter((supplier) => supplier.origin === origin);
      return { origin, companies: group.length, total: sumBy(group, (supplier) => supplier.total) };
    })
    .filter((group) => group.companies > 0);

  const cities = new Map<string, { companies: number; total: number }>();
  for (const supplier of suppliers) {
    const key = supplier.city ?? "Não informada";
    const city = cities.get(key) ?? { companies: 0, total: 0 };
    city.companies += 1;
    city.total += supplier.total;
    cities.set(key, city);
  }
  const topCities = [...cities.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 10);

  return [
    { title: "Indicadores principais", description: "Microempresas que venceram licitações do município no período.", blocks: [{ kind: "kpis", items: kpis }, ...natureNote(request)] },
    {
      title: "Origem das microempresas",
      description: "Onde ficam as microempresas vencedoras, pelo endereço do cadastro.",
      blocks: [
        {
          kind: "table",
          columns: [
            { label: "Origem", width: 3.4 },
            { label: "Empresas", width: 1, align: "right" },
            { label: "Valor vencido", width: 1.8, align: "right" },
            { label: "% do valor", width: 1.1, align: "right" },
          ],
          rows: origins.map((group) => [ORIGIN_LABEL[group.origin], count(group.companies), money(group.total), pct(shareOf(group.total, total))]),
          total: origins.length ? ["Total", count(suppliers.length), money(total), pct(total > 0 ? 100 : null)] : undefined,
          emptyText: "Nenhuma microempresa venceu licitações no período.",
        },
        {
          kind: "table",
          title: "Cidades com maior valor vencido",
          columns: [
            { label: "Cidade/UF", width: 3.4 },
            { label: "Empresas", width: 1, align: "right" },
            { label: "Valor vencido", width: 1.8, align: "right" },
            { label: "% do valor", width: 1.1, align: "right" },
          ],
          rows: topCities.map(([city, group]) => [city, count(group.companies), money(group.total), pct(shareOf(group.total, total))]),
          emptyText: "Nenhuma microempresa venceu licitações no período.",
        },
      ],
    },
    {
      title: "Lista de microempresas vencedoras",
      description: "Todas as microempresas vencedoras, do maior para o menor valor vencido.",
      blocks: [supplierRankTable(suppliers, total), { kind: "note", text: NOTE_ME_ONLY }],
    },
  ];
}

async function expenseReport(request: ReportRequest, sources: Sources): Promise<ReportSection[]> {
  const [summary, expenses, bids] = await Promise.all([sources.meSummary(), sources.expenses(), sources.bids()]);
  const bidsTotal = sumBy(bids, (bid) => toNumber(bid.valor_total_licitacao));
  const biggest = [...bids].sort((a, b) => toNumber(b.valor_total_licitacao) - toNumber(a.valor_total_licitacao))[0];
  const ordered = [...bids].sort(
    (a, b) => (a.data_realizacao_licitacao ?? "").localeCompare(b.data_realizacao_licitacao ?? "") || a.numero_licitacao.localeCompare(b.numero_licitacao),
  );

  const kpis: ReportKpi[] = [
    {
      label: "Dotação associada",
      value: money(sumBy(expenses, (row) => toNumber(row.valor_total_dotacao))),
      detail: plural(sumBy(expenses, (row) => row.quantidade_dotacoes), "dotação", "dotações"),
    },
    { label: "Licitações no período", value: count(bids.length), detail: "Com data de realização no período" },
    { label: "Valor total das licitações", value: money(bidsTotal), detail: "Soma do valor de cada licitação" },
    { label: "Valor médio por licitação", value: money(bids.length ? bidsTotal / bids.length : 0), detail: "Valor total dividido pelo nº de licitações" },
    {
      label: "Maior licitação",
      value: biggest ? money(toNumber(biggest.valor_total_licitacao)) : "—",
      detail: biggest ? `Nº ${biggest.numero_licitacao} · ${formatDateBr(biggest.data_realizacao_licitacao)}` : "Nenhuma licitação no período",
    },
    { label: "Valor vencido", value: money(toNumber(summary.valor_total_vencido)), detail: "Homologado às empresas vencedoras" },
  ];

  return [
    { title: "Indicadores principais", description: "Gastos previstos e licitações do município no período.", blocks: [{ kind: "kpis", items: kpis }, ...natureNote(request)] },
    {
      title: "Dotação por natureza da despesa",
      description: "Valor do orçamento associado às licitações de cada natureza.",
      blocks: [dotationTable(expenses), { kind: "note", text: NOTE_DOTATION }],
    },
    { title: "Evolução mensal", description: "Valor das licitações por mês de realização.", blocks: [monthlyBars(bids)] },
    {
      title: "Licitações do período",
      description: "Todas as licitações do período, em ordem de data de realização.",
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
              natures.length ? natures.join("; ") : "Sem dotação associada",
              count(bid.quantidade_empresas),
              count(bid.quantidade_itens),
              money(toNumber(bid.valor_total_licitacao)),
            ];
          }),
          total: ordered.length ? ["Total", "", plural(ordered.length, "licitação", "licitações"), "", "", money(bidsTotal)] : undefined,
          emptyText: "Nenhuma licitação no período.",
        },
      ],
    },
  ];
}

const BUILDERS: Record<ReportRequest["model"], (request: ReportRequest, sources: Sources) => Promise<ReportSection[]>> = {
  geral: generalReport,
  natureza: natureReport,
  fornecedores: supplierReport,
  despesas: expenseReport,
};

function periodLabel(year: number, today: Date): string {
  const end = today.getUTCFullYear() === year ? `${formatDateBr(today.toISOString())} (ano em curso)` : `31/12/${year}`;
  return `01/01/${year} a ${end}`;
}

export async function buildGestorReport(request: ReportRequest): Promise<ReportDocument> {
  const model = reportModel(request.model);
  const now = new Date();
  const sections = await BUILDERS[request.model](request, reportSources(request));
  return {
    model: request.model,
    title: model.title,
    summary: model.description,
    municipality: request.municipality.name,
    state: "CE",
    year: request.year,
    period: periodLabel(request.year, now),
    nature: request.natureCode ? natureLabel(request.natureCode) : "Todas as naturezas",
    generatedAt: now.toISOString(),
    source: SOURCE,
    sections,
  };
}
