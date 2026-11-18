import assert from "node:assert/strict";
import test from "node:test";
import { jsPDF } from "jspdf";
import { api } from "../src/api/client";
import { buildGestorReport, ReportDataError, type ReportRequest } from "../src/features/dashboard/gestor-publico/relatorios/report-data";
import type { ReportBlock, ReportDocument } from "../src/features/dashboard/gestor-publico/relatorios/report-document";
import { layoutReport, type Surface } from "../src/features/dashboard/gestor-publico/relatorios/report-layout";
import { createPdfSurface } from "../src/features/dashboard/gestor-publico/relatorios/surface-pdf";
import {
  groupSuppliers,
  natureTotals,
  porteOf,
  statsByPorte,
  summaryTotals,
  toCents,
  unclassifiedBreakdown,
} from "../src/features/dashboard/gestor-publico/relatorios/report-portes";
import type { PaymentNature, PaymentSupplier } from "../src/services/analytics/payments.types";

// ---------- Dados de exemplo (estrutura igual à da API, Amontada/2025) ----------
const categories = (me: string, epp: string, demais: string, extra: Record<string, string> = {}) => ({
  ME: me, EPP: epp, DEMAIS: demais, PORTE_NAO_INFORMADO: "0.00", SEM_CLASSIFICACAO: "0.00",
  ME_EXCLUIDA_REGRA_MEI: "0.00", FAVORECIDO_CPF: "0.00", DOCUMENTO_INVALIDO_OU_AUSENTE: "0.00", ...extra,
});

const nature = (code: string, name: string, total: string, values: Record<string, string>, payments: number): PaymentNature => ({
  codigo_natureza: code, nome_natureza: name, total_controle: total, quantidade_pagamentos: payments,
  valores_por_categoria: values, valor_me: values.ME, percentual_me: null, reconciliado: true,
});

const NATURES = [
  nature("30", "MATERIAL DE CONSUMO", "19340511.14", categories("7332677.12", "4100472.92", "7907361.10"), 900),
  nature("32", "MATERIAL, BEM OU SERVIÇO PARA DISTRIBUIÇÃO GRATUITA", "1691516.54", categories("1124342.68", "166488.60", "398235.26", { DOCUMENTO_INVALIDO_OU_AUSENTE: "2450.00" }), 70),
  nature("39", "OUTROS SERVIÇOS DE TERCEIROS – PESSOA JURÍDICA", "52304281.77", categories("10429895.65", "15992998.94", "25881387.18"), 2800),
];

const SUMMARY = {
  coleta: {
    coleta_id: 26, codigo_municipio: "010", exercicio_orcamento: "202500", referencia_empenhos_inicio: "202501", referencia_empenhos_fim: "202512",
    referencia_pagamentos_inicio: "202501", referencia_pagamentos_fim: "202610", orgaos_excluidos: ["17"], regra_mei: "incluir",
    fonte_cadastral: "OpenCNPJ", referencia_base_cadastral: "NAO_INFORMADA", status: "concluida", reconciliado: true, quantidade_pendencias: 2, finalizado_em: "2026-11-04T20:00:00Z",
  },
  data: NATURES,
  total_controle: "73336309.45",
  total_me: "18886915.45",
  percentual_me: 25.75,
  pendencias: [{ tipo: "PAGAMENTO_SEM_EMPENHO", quantidade: 2, valor: "150.00" }],
  observacao: "Valor pago = notas de pagamento não estornadas.",
};

const supplier = (patch: Partial<PaymentSupplier>): PaymentSupplier => ({
  codigo_natureza: "30", nome_natureza: "MATERIAL DE CONSUMO", documento: "00000000000100", tipo_documento: "CNPJ",
  nome_negociante: "EMPRESA", categoria_porte: "ME", porte_codigo: "01", situacao_classificacao: "classificado",
  quantidade_pagamentos: 1, valor_pago: "0.00", ...patch,
});

// Uma linha por natureza e porte, somando exatamente o resumo. Os CNPJs
// 11…, 22… e 33… aparecem em mais de uma natureza.
function supplierRows(): PaymentSupplier[] {
  const rows: PaymentSupplier[] = [];
  const docs = { ME: "11111111000111", EPP: "22222222000122", DEMAIS: "33333333000133" } as const;
  for (const row of NATURES) {
    for (const porte of ["ME", "EPP", "DEMAIS"] as const) {
      const value = toCents(row.valores_por_categoria[porte]);
      const half = Math.floor(value / 2);
      rows.push(supplier({ codigo_natureza: row.codigo_natureza, nome_natureza: row.nome_natureza, documento: docs[porte], nome_negociante: `EMPRESA ${porte} UM`, categoria_porte: porte, quantidade_pagamentos: 5, valor_pago: (half / 100).toFixed(2) }));
      rows.push(supplier({ codigo_natureza: row.codigo_natureza, nome_natureza: row.nome_natureza, documento: `${docs[porte].slice(0, 8)}0001${row.codigo_natureza}`, nome_negociante: `EMPRESA ${porte} ${row.codigo_natureza}`, categoria_porte: porte, quantidade_pagamentos: 3, valor_pago: ((value - half) / 100).toFixed(2) }));
    }
  }
  rows.push(supplier({ codigo_natureza: "32", documento: "SHZGPF==", tipo_documento: "INVALIDO", nome_negociante: "PESSOA FISICA", categoria_porte: "DOCUMENTO_INVALIDO_OU_AUSENTE", porte_codigo: null, valor_pago: "2450.00", quantidade_pagamentos: 7 }));
  // Mais de uma página (100 linhas) para exercitar a paginação.
  for (let index = 0; index < 120; index += 1) {
    rows.push(supplier({ codigo_natureza: "39", documento: `4444${String(index).padStart(6, "0")}0001`, nome_negociante: `ZERO ${index}`, categoria_porte: "DEMAIS", valor_pago: "0.00" }));
  }
  return rows;
}

const OTHER_SIZES = {
  filtros: { codigo_municipio: "010", ano: 2025, categoria_porte: null, porte_codigo: null },
  periodo: { inicio: "2025-01-01", fim: "2025-12-31" },
  resumo: [
    { categoria_porte: "EPP", porte_codigo: "03", total_valor: "599544.20", quantidade_pagamentos: 37, percentual_valor: 13.5 },
    { categoria_porte: "DEMAIS", porte_codigo: "05", total_valor: "3856447.19", quantidade_pagamentos: 228, percentual_valor: 86.5 },
  ],
  municipios: [],
  evolucao_temporal: [
    { periodo: "2025-01", ano: 2025, mes: 1, categoria_porte: "EPP", porte_codigo: "03", total_valor: "29580.0000", quantidade_pagamentos: 2 },
    { periodo: "2025-01", ano: 2025, mes: 1, categoria_porte: "DEMAIS", porte_codigo: "05", total_valor: "144783.2700", quantidade_pagamentos: 33 },
    { periodo: "2025-02", ano: 2025, mes: 2, categoria_porte: "EPP", porte_codigo: "03", total_valor: "569964.2000", quantidade_pagamentos: 35 },
    { periodo: "2025-02", ano: 2025, mes: 2, categoria_porte: "DEMAIS", porte_codigo: "05", total_valor: "3711663.9200", quantidade_pagamentos: 195 },
  ],
  total_valor: "4455991.39",
  quantidade_pagamentos: 265,
  fonte_classificacao: "cadastro",
  observacao: "Inclui somente EPP e DEMAIS.",
};

const COMPANIES = [
  { cnpj: "11111111000111", razao_social: "A", nome_fantasia: null, situacao_cadastral: "ATIVA", cnae_principal: null, porte_empresa: "ME", uf_empresa: "CE", municipio_empresa: "AMONTADA" },
  { cnpj: "22222222000122", razao_social: "B", nome_fantasia: null, situacao_cadastral: "ATIVA", cnae_principal: null, porte_empresa: "EPP", uf_empresa: "CE", municipio_empresa: "FORTALEZA" },
  { cnpj: "33333333000133", razao_social: "C", nome_fantasia: null, situacao_cadastral: "ATIVA", cnae_principal: null, porte_empresa: "DEMAIS", uf_empresa: "SP", municipio_empresa: "SAO PAULO" },
];

const COMPARISON = {
  universo: { quantidade_itens: 2417, quantidade_licitacoes: 186, valor_total: "126441749.35" },
  por_classificacao: [
    { classificacao: "OUTRO", quantidade_itens: 780, quantidade_licitacoes: 64, valor_total: "61638487.66" },
    { classificacao: "ME", quantidade_itens: 969, quantidade_licitacoes: 73, valor_total: "48944242.81" },
    { classificacao: "EPP", quantidade_itens: 469, quantidade_licitacoes: 32, valor_total: "13361023.43" },
    { classificacao: "MEI", quantidade_itens: 1, quantidade_licitacoes: 1, valor_total: "41322.84" },
    { classificacao: "DESCONHECIDA", quantidade_itens: 198, quantidade_licitacoes: 33, valor_total: "2456672.61" },
  ],
};

const STATES = [
  { classificacao_localizacao: "CE", uf_empresa: "CE", total_pago: "60000000.00", quantidade_pagamentos: 3000, quantidade_empresas: 200, participacao_percentual: 81.8 },
  { classificacao_localizacao: "OUTRA_UF", uf_empresa: "SP", total_pago: "13333859.45", quantidade_pagamentos: 600, quantidade_empresas: 40, participacao_percentual: 18.2 },
  { classificacao_localizacao: "DOCUMENTO_NAO_CNPJ", uf_empresa: null, total_pago: "2450.00", quantidade_pagamentos: 7, quantidade_empresas: 0, participacao_percentual: 0 },
];

const BIDS = [
  { codigo_municipio: "010", municipio: "AMONTADA", numero_licitacao: "0101202501", data_realizacao_licitacao: "2025-01-10", valor_total_licitacao: "1000.00", quantidade_empresas: 2, quantidade_itens: 3, naturezas_despesa: ["MATERIAL DE CONSUMO"] },
  { codigo_municipio: "010", municipio: "AMONTADA", numero_licitacao: "0202202501", data_realizacao_licitacao: "2025-02-20", valor_total_licitacao: "2500.50", quantidade_empresas: 1, quantidade_itens: 1, naturezas_despesa: [] },
];

// ---------- Mocks: backend (axios) e API de dados (fetch) ----------
interface MockOptions {
  summaryStatus?: number;
  otherSizesFails?: boolean;
  dataApiFails?: boolean;
  wrongCollection?: boolean;
}

function mockSources(options: MockOptions = {}) {
  const calls: Array<{ url?: string; params: Record<string, unknown> }> = [];
  const rows = supplierRows();
  const originalFetch = globalThis.fetch;
  const originalAdapter = api.defaults.adapter;
  const fail = (config: unknown, status: number) =>
    Promise.reject(Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, config, response: { status, data: {}, headers: {}, config, statusText: "" } }));
  api.defaults.adapter = async (config) => {
    const params = config.params ?? {};
    calls.push({ url: config.url, params });
    const ok = (data: unknown) => ({ config, status: 200, statusText: "OK", headers: {}, data });
    if (config.url === "/analytics/pagamentos/resumo") {
      if (options.summaryStatus) return fail(config, options.summaryStatus);
      return ok(SUMMARY);
    }
    if (config.url === "/analytics/pagamentos/fornecedores") {
      return ok({ limit: params.limit, offset: params.offset, coleta_id: options.wrongCollection ? 99 : params.coleta_id, data: rows.slice(params.offset, params.offset + params.limit) });
    }
    if (config.url === "/analytics/pagamentos/outros-portes") {
      if (options.otherSizesFails) return fail(config, 502);
      return ok(OTHER_SIZES);
    }
    throw new Error(`Endpoint inesperado ${config.url}`);
  };
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (options.dataApiFails) return new Response("erro", { status: 503 });
    const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
    if (url.pathname.endsWith("/empresas")) return json({ data: Number(url.searchParams.get("offset")) === 0 ? COMPANIES : [] });
    if (url.pathname.endsWith("/analytics/comparativo-classificacao")) return json(COMPARISON);
    if (url.pathname.endsWith("/api/v1/estadual/fornecedores/localizacao")) {
      assert.equal(url.searchParams.get("codigo_municipio"), "010");
      return json({ data: Number(url.searchParams.get("offset")) === 0 ? STATES : [] });
    }
    if (url.pathname.endsWith("/licitacoes")) return json({ data: Number(url.searchParams.get("offset")) === 0 ? BIDS : [] });
    throw new Error(`URL inesperada ${url}`);
  }) as typeof fetch;
  return {
    calls,
    restore() {
      api.defaults.adapter = originalAdapter;
      globalThis.fetch = originalFetch;
    },
  };
}

const request = (patch: Partial<ReportRequest> = {}): ReportRequest => ({
  model: "geral",
  municipality: { ibgeCode: "2300754", tceCode: "010", name: "Amontada" },
  year: 2025,
  ...patch,
});

// Valores em reais usam espaço não separável entre "R$" e o número.
const plain = (value: string | undefined) => value?.replace(/\u00A0/g, " ");
const blocks = (report: ReportDocument) => report.sections.flatMap((section) => section.blocks);
const tables = (report: ReportDocument) => blocks(report).filter((block): block is Extract<ReportBlock, { kind: "table" }> => block.kind === "table");
const text = (report: ReportDocument) => JSON.stringify(report);

// Superfície de medição sem DOM: ~0,5 em por caractere.
function fakeSurface(): Surface & { pages: number; texts: string[] } {
  let pages = 1;
  const texts: string[] = [];
  return {
    paginated: true,
    get pages() { return pages; },
    texts,
    measure: (value, style) => value.length * style.size * 0.3528 * 0.5,
    text: (value) => void texts.push(value),
    box: () => {},
    line: () => {},
    image: () => {},
    addPage: () => void (pages += 1),
    pageCount: () => pages,
    goToPage: () => {},
  };
}

// ---------- Testes ----------
test("portes: classifica categorias e fecha os totais com o total pago", () => {
  assert.equal(porteOf("ME"), "ME");
  assert.equal(porteOf("epp"), "EPP");
  assert.equal(porteOf("DEMAIS"), "DEMAIS");
  assert.equal(porteOf("FAVORECIDO_CPF"), "OUTROS");
  assert.equal(porteOf(null), "OUTROS");

  const row = natureTotals(NATURES[1]);
  assert.deepEqual(row, { ME: 112434268, EPP: 16648860, DEMAIS: 39823526, OUTROS: 245000, total: 169151654 });
  const totals = summaryTotals(NATURES);
  assert.equal(totals.ME + totals.EPP + totals.DEMAIS + totals.OUTROS, totals.total);
  assert.equal(totals.total, toCents(SUMMARY.total_controle));
  assert.deepEqual(unclassifiedBreakdown(NATURES), [{ category: "DOCUMENTO_INVALIDO_OU_AUSENTE", label: "documento inválido ou ausente", cents: 245000 }]);
  assert.throws(() => toCents("abc"));

  const grouped = groupSuppliers(supplierRows());
  const me = grouped.find((item) => item.key === "11111111000111")!;
  assert.equal(me.natures.size, 3, "mesmo CNPJ em três naturezas vira uma linha");
  const stats = statsByPorte(grouped);
  assert.equal(stats.OUTROS.suppliers, 1);
  assert.equal(grouped.find((item) => item.porte === "OUTROS")?.cnpj, null);
});

test("relatórios: os quatro modelos comparam ME, EPP e demais com a mesma estrutura", async () => {
  const mock = mockSources();
  try {
    for (const model of ["geral", "natureza", "fornecedores", "despesas"] as const) {
      const report = await buildGestorReport(request({ model }));
      const titles = report.sections.map((section) => section.title);
      assert.equal(titles.find((title) => title === "Indicadores principais"), "Indicadores principais", model);
      assert.ok(titles.includes("Comparativo por porte de empresa"), model);
      assert.equal(titles.at(-1), "Metodologia e fontes", model);
      assert.equal(report.period, "Orçamento 2025 · pagamentos de 01/2025 a 10/2026");

      const comparison = tables(report).find((table) => table.columns[0].label === "Porte da empresa")!;
      assert.deepEqual(comparison.rows.map((row) => row[0]), ["Microempresas (ME)", "Empresas de pequeno porte (EPP)", "Demais empresas", "Sem classificação de porte"]);
      assert.equal(plain(comparison.total?.[3]), "R$ 73.336.309,45", "total do comparativo = total pago");
      // Demais empresas não absorve o documento inválido.
      assert.equal(plain(comparison.rows[2][3]), "R$ 34.186.983,54");
      assert.equal(plain(comparison.rows[3][3]), "R$ 2.450,00");

      // Toda tabela tem uma célula por coluna.
      for (const table of tables(report)) {
        for (const row of [...table.rows, ...(table.total ? [table.total] : [])]) assert.equal(row.length, table.columns.length, `${model}: ${table.title ?? table.columns[0].label}`);
      }
      // O layout desenha o relatório inteiro sem erro, paginado.
      const surface = fakeSurface();
      layoutReport(report, surface);
      assert.ok(surface.pages >= 2, model);
      assert.ok(surface.texts.some((value) => value.startsWith("Página 1 de")), model);
      // PDF real (jsPDF) do mesmo relatório.
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      layoutReport(report, createPdfSurface(doc), { logo: null });
      assert.ok(doc.getNumberOfPages() >= 2, model);
      assert.ok(doc.output("arraybuffer").byteLength > 5_000, model);
    }

    const general = await buildGestorReport(request({ model: "geral" }));
    const byNature = tables(general).find((table) => table.columns[0].label === "Natureza da despesa")!;
    assert.deepEqual(byNature.columns.map((column) => column.label), ["Natureza da despesa", "ME (R$)", "EPP (R$)", "Demais (R$)", "Sem classificação (R$)", "Total (R$)", "% ME + EPP"]);
    assert.equal(byNature.rows[0][0], "Outros serviços de terceiros - pessoa jurídica", "maior natureza primeiro");
    assert.equal(byNature.total?.[5], "73.336.309,45");
    const officialStates = tables(general).find((table) => table.title === "Todos os portes, por UF da sede")!;
    assert.deepEqual(officialStates.rows.map((row) => row[0]), ["CE", "SP", "Favorecido sem CNPJ"]);
    assert.equal(plain(officialStates.total?.[3]), "R$ 73.336.309,45");
    // O cadastro de exemplo tem EPP e demais: a divisão por porte usa os três.
    const states = tables(general).find((table) => table.title === "Divisão por porte")!; // cadastro de exemplo cobre os três portes
    assert.deepEqual(states.rows.map((row) => row[0]).sort(), ["CE", "Não identificada", "SP"]);
    assert.equal(states.total?.[6], "73.336.309,45", "estados somam o total pago");
    const monthly = tables(general).find((table) => table.columns[0].label === "Mês")!;
    assert.equal(monthly.rows.length, 12);
    assert.deepEqual(monthly.rows[1].slice(2, 5), ["569.964,20", "3.711.663,92", "4.281.628,12"]);

    const suppliers = await buildGestorReport(request({ model: "fornecedores" }));
    const list = tables(suppliers).find((table) => table.columns[1]?.label === "Empresa" && table.columns[0].label === "Nº")!;
    assert.ok(list.rows.every((row) => /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(row[2])), "lista só com CNPJ válido");
    assert.ok(!text(suppliers).includes("PESSOA FISICA"), "favorecido sem CNPJ não é listado pelo nome");
    assert.ok(text(suppliers).includes("Do próprio município"));

    const expenses = await buildGestorReport(request({ model: "despesas" }));
    const winners = tables(expenses).find((table) => table.columns[0].label === "Classificação do vencedor")!;
    assert.deepEqual(winners.rows.map((row) => row[0]), [
      "Microempresas (ME)", "Microempreendedores individuais (MEI)", "Empresas de pequeno porte (EPP)", "Demais empresas", "Classificação desconhecida",
    ]);
    assert.ok(text(expenses).includes("0101202501"));
  } finally {
    mock.restore();
  }
});

test("relatórios: filtro de natureza vale para todas as tabelas", async () => {
  const mock = mockSources();
  try {
    const report = await buildGestorReport(request({ model: "natureza", natureCode: "32" }));
    assert.equal(report.nature, "Material, bem ou serviço para distribuição gratuita");
    const comparison = tables(report).find((table) => table.columns[0].label === "Porte da empresa")!;
    assert.equal(plain(comparison.total?.[3]), "R$ 1.691.516,54");
    const byNature = tables(report).find((table) => table.columns[0].label === "Natureza da despesa")!;
    assert.equal(byNature.rows.length, 1);

    const expenses = await buildGestorReport(request({ model: "despesas", natureCode: "30" }));
    assert.ok(text(expenses).includes("não separa a evolução mensal"));
    assert.ok(text(expenses).includes("não separa a classificação dos vencedores"));
    const bids = tables(expenses).find((table) => table.columns[0].label === "Licitação")!;
    assert.deepEqual(bids.rows.map((row) => row[0]), ["0101202501"]);
    assert.ok(text(expenses).includes("1 licitação do ano ainda não tem natureza associada"));
    // Fornecedores pedidos uma vez por página, sempre na coleta do resumo e com todos os portes.
    const supplierCalls = mock.calls.filter((call) => call.url === "/analytics/pagamentos/fornecedores");
    assert.ok(supplierCalls.every((call) => call.params.coleta_id === 26 && call.params.categoria_porte === ""));
  } finally {
    mock.restore();
  }
});

test("relatórios: fontes complementares fora do ar não derrubam o relatório", async () => {
  const mock = mockSources({ otherSizesFails: true, dataApiFails: true });
  try {
    const report = await buildGestorReport(request({ model: "despesas" }));
    assert.ok(text(report).includes("Não foi possível carregar a evolução mensal de EPP e demais empresas agora"));
    assert.ok(text(report).includes("Não foi possível carregar as licitações do período agora"));
    const comparison = tables(report).find((table) => table.columns[0].label === "Porte da empresa")!;
    assert.equal(plain(comparison.total?.[3]), "R$ 73.336.309,45");
    layoutReport(report, fakeSurface());
  } finally {
    mock.restore();
  }
});

test("relatórios: ano sem apuração e lista inconsistente viram mensagens claras", async () => {
  let mock = mockSources({ summaryStatus: 404 });
  try {
    await assert.rejects(buildGestorReport(request({ year: 2023 })), (error: unknown) => {
      assert.ok(error instanceof ReportDataError);
      assert.equal(error.status, 404);
      assert.match(error.message, /Ainda não há apuração de pagamentos concluída para Amontada em 2023/);
      return true;
    });
  } finally {
    mock.restore();
  }
  mock = mockSources({ wrongCollection: true });
  try {
    await assert.rejects(buildGestorReport(request()), /outra coleta/);
  } finally {
    mock.restore();
  }
});
