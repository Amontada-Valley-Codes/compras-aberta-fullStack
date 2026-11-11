import { loadCompanyDirectory } from "@/features/dashboard/gestor/gestor-api";
import { natureLabel } from "@/features/public-data/plain-language";
import { getPaymentsSummaryService, listPaymentSuppliersService } from "@/services/analytics/payments.service";
import type { PaymentSupplier, PaymentsSummaryResponse } from "@/services/analytics/payments.types";
import type { ReportRequest } from "./report-data";
import type { ReportBlock, ReportSection } from "./report-document";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value).replace(/\s/g, " ");
const percentage = (part: number, total: number) => total ? (part / total * 100).toFixed(1) : "0.0";
const amount = (value: string | undefined) => Number(value ?? 0);
const PAGE_SIZE = 100;
const MAX_PAGES = 300;

type Totals = { demais: number; me: number; epp: number; total: number };
const zero = (): Totals => ({ demais: 0, me: 0, epp: 0, total: 0 });
const add = (target: Totals, source: Totals) => {
  target.demais += source.demais;
  target.me += source.me;
  target.epp += source.epp;
  target.total += source.total;
};
const categoryTotals = (value: number, category: string): Totals => ({
  demais: category === "ME" || category === "EPP" ? 0 : value,
  me: category === "ME" ? value : 0,
  epp: category === "EPP" ? value : 0,
  total: value,
});
const cells = (label: string, totals: Totals) => [
  label, money(totals.demais), money(totals.me), money(totals.epp), money(totals.total),
  percentage(totals.me + totals.epp, totals.total), percentage(totals.me, totals.total),
];

async function allPaymentSuppliers(code: string, year: number, collection: number): Promise<PaymentSupplier[]> {
  const rows: PaymentSupplier[] = [];
  for (let start = 0; start < MAX_PAGES; start += 8) {
    const pages = await Promise.all(Array.from({ length: Math.min(8, MAX_PAGES - start) }, (_, index) => {
      const offset = (start + index) * PAGE_SIZE;
      return listPaymentSuppliersService({ codigo_municipio: code, ano: year, coleta_id: collection, categoria_porte: "", limit: PAGE_SIZE, offset });
    }));
    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index];
      if (page.coleta_id !== collection || page.offset !== (start + index) * PAGE_SIZE) throw new Error("A API retornou outra coleta ou página de fornecedores.");
      rows.push(...page.data);
      if (page.data.length < PAGE_SIZE) return rows;
    }
  }
  throw new Error("A lista de fornecedores ultrapassou o limite de páginas do relatório.");
}

function table(title: string, firstColumn: string, rows: string[][], total: Totals): ReportBlock {
  return {
    kind: "table", title,
    columns: [
      { label: firstColumn, width: 2.25 },
      { label: "Demais empresas", width: 1.4, align: "right" },
      { label: "Microempresa", width: 1.4, align: "right" },
      { label: "Empresa de pequeno porte", width: 1.4, align: "right" },
      { label: "Valor total", width: 1.55, align: "right" },
      { label: "% Micro e pequena empresa", width: 0.9, align: "right" },
      { label: "% Microempresa", width: 0.9, align: "right" },
    ],
    rows, total: cells("Total", total), emptyText: "Nenhum valor disponível para este recorte.",
  };
}

function natureTable(summary: PaymentsSummaryResponse, request: ReportRequest): ReportBlock {
  const rows = summary.data.filter((row) => !request.natureCode || row.codigo_natureza === request.natureCode)
    .sort((a, b) => amount(b.total_controle) - amount(a.total_controle));
  const total = zero();
  const formatted = rows.map((row) => {
    const categories = row.valores_por_categoria;
    const value = amount(row.total_controle);
    const me = amount(categories.ME ?? row.valor_me);
    const epp = amount(categories.EPP);
    const values = { demais: Math.max(0, value - me - epp), me, epp, total: value };
    add(total, values);
    return cells(natureLabel(row.codigo_natureza, row.nome_natureza).toLocaleUpperCase("pt-BR"), values);
  });
  return table(`Tabela 01: Total das compras governamentais por natureza de despesa - ${request.municipality.name.toLocaleUpperCase("pt-BR")}/${request.year}`, "Natureza das despesas", formatted, total);
}

function groupGeography(rows: PaymentSupplier[], directory: Awaited<ReturnType<typeof loadCompanyDirectory>>, type: "uf" | "city") {
  const groups = new Map<string, Totals>();
  const grand = zero();
  for (const row of rows) {
    const company = row.tipo_documento === "CNPJ" ? directory.get(row.documento.replace(/\D/g, "")) : undefined;
    const uf = company?.uf_empresa?.trim().toLocaleUpperCase("pt-BR") || "NÃO INFORMADA";
    if (type === "city" && uf !== "CE") continue;
    const key = type === "uf" ? uf : company?.municipio_empresa?.trim().toLocaleUpperCase("pt-BR") || "NÃO INFORMADO";
    const values = categoryTotals(amount(row.valor_pago), row.categoria_porte);
    add(groups.get(key) ?? (groups.set(key, zero()), groups.get(key)!), values);
    add(grand, values);
  }
  return { rows: [...groups].sort((a, b) => b[1].total - a[1].total).map(([label, values]) => cells(label, values)), total: grand };
}

export async function buildReferenceReport(request: ReportRequest): Promise<ReportSection[]> {
  const code = request.municipality.tceCode;
  const summary = await getPaymentsSummaryService({ codigo_municipio: code, ano: request.year });
  const [suppliers, directory] = await Promise.all([
    allPaymentSuppliers(code, request.year, summary.coleta.coleta_id),
    loadCompanyDirectory(),
  ]);
  const filtered = request.natureCode ? suppliers.filter((row) => row.codigo_natureza === request.natureCode) : suppliers;
  const states = groupGeography(filtered, directory, "uf");
  const cities = groupGeography(filtered, directory, "city");
  const unknownLocation = filtered.reduce((sum, row) => {
    const company = row.tipo_documento === "CNPJ" ? directory.get(row.documento.replace(/\D/g, "")) : undefined;
    return sum + (company?.uf_empresa ? 0 : amount(row.valor_pago));
  }, 0);
  const overall = request.natureCode ? summary.data.filter((row) => row.codigo_natureza === request.natureCode).reduce((sum, row) => sum + amount(row.total_controle), 0) : amount(summary.total_controle);
  const me = request.natureCode ? summary.data.filter((row) => row.codigo_natureza === request.natureCode).reduce((sum, row) => sum + amount(row.valores_por_categoria.ME), 0) : amount(summary.total_me);
  const epp = summary.data.filter((row) => !request.natureCode || row.codigo_natureza === request.natureCode).reduce((sum, row) => sum + amount(row.valores_por_categoria.EPP), 0);
  const note = `Fonte: API Compras Abertas / TCE-CE, pagamentos da coleta ${summary.coleta.coleta_id} (acesso em ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" })}).`;
  const locationNote = `${money(unknownLocation)} em pagamentos não têm UF identificada no cadastro de empresas. A tabela municipal considera somente fornecedores com UF Ceará identificada.`;
  const coverage = `Os valores correspondem a pagamentos vinculados ao orçamento ${request.year}, com referências de ${summary.coleta.referencia_pagamentos_inicio} a ${summary.coleta.referencia_pagamentos_fim}. Órgãos excluídos: ${summary.coleta.orgaos_excluidos.join(", ") || "nenhum"}. A localização é a do cadastro de empresas; fornecedores sem sede identificada aparecem em “não informada”.`;
  return [
    { title: "Apresentação", blocks: [
      { kind: "paragraph", text: "As contratações públicas municipais constituem um dos principais instrumentos de política econômica disponíveis ao gestor local. Por meio das aquisições de bens, serviços e obras, o poder público pode fortalecer a produção local, ampliar a geração de emprego e renda e promover o desenvolvimento econômico do município." },
      { kind: "paragraph", text: "A Lei Complementar nº 123, de 14 de dezembro de 2006, estabelece prerrogativas para microempresas e empresas de pequeno porte nas licitações públicas. A aplicação desses dispositivos pode ampliar a participação dos pequenos negócios nas compras governamentais." },
      { kind: "paragraph", text: `Este relatório oferece um diagnóstico quantitativo das compras públicas de ${request.municipality.name.toLocaleUpperCase("pt-BR")} no exercício ${request.year}, com foco no porte das empresas por natureza de despesa e na localização dos fornecedores. Os resultados podem apoiar o planejamento de ações para fortalecer os pequenos negócios locais.` },
    ] },
    { title: "Metodologia", pageBreakBefore: true, blocks: [
      { kind: "paragraph", text: "Os dados foram obtidos da API Compras Abertas, que consolida pagamentos do Portal da Transparência dos Municípios do Tribunal de Contas do Estado do Ceará (TCE-CE). O valor pago representa notas de pagamento não estornadas vinculadas a empenhos do orçamento selecionado." },
      { kind: "paragraph", text: "Foram analisadas as seguintes naturezas de despesa:" },
      { kind: "list", items: summary.data.filter((row) => !request.natureCode || row.codigo_natureza === request.natureCode).map((row) => natureLabel(row.codigo_natureza, row.nome_natureza)) },
      { kind: "paragraph", text: "A classificação de porte utiliza os dados cadastrais da coleta. A distribuição por estado e município é obtida pelo cruzamento dos documentos dos fornecedores com o cadastro de empresas disponibilizado pela API. Categorias sem classificação de ME ou EPP integram “Demais empresas” nas tabelas." },
      { kind: "paragraph", text: coverage },
    ] },
    { title: `Participação da MPE no total das compras públicas de ${request.municipality.name.toLocaleUpperCase("pt-BR")}`, blocks: [
      { kind: "paragraph", text: `O total pago no recorte foi ${money(overall)}. Microempresas receberam ${money(me)} (${percentage(me, overall)}%) e empresas de pequeno porte receberam ${money(epp)} (${percentage(epp, overall)}%). Juntas, representam ${percentage(me + epp, overall)}% do valor.` },
    ] },
    { title: "", hideTitle: true, pageBreakBefore: true, blocks: [natureTable(summary, request), { kind: "note", text: note }] },
    { title: "", hideTitle: true, pageBreakBefore: true, blocks: [table("Tabela 02: Distribuição geográfica dos fornecedores por estado", "UF do favorecido", states.rows, states.total), { kind: "note", text: locationNote }, { kind: "note", text: note }] },
    { title: "", hideTitle: true, pageBreakBefore: true, blocks: [table("Tabela 03: Distribuição geográfica dos fornecedores por município do Ceará", "Município do favorecido", cities.rows, cities.total), { kind: "note", text: locationNote }, { kind: "note", text: note }] },
  ];
}
