import assert from "node:assert/strict";
import test from "node:test";
import { api, catalogApi } from "../src/api/client";
import { loadAnalysisData } from "../src/features/public-data/public-data";
import { selectAnalysisExpenses, selectAnalysisParticipation, selectAnalysisPercentages } from "../src/features/analysis/analysis-selectors";
import { GET } from "../src/app/analise/exportar/route";

test("/analise usa a operação correspondente a cada métrica, com filtros e falhas independentes", async () => {
  const calls: Array<{ url?: string; params: Record<string, unknown> }> = [];
  let failExpenses = false;
  let failMicro = false;
  const row = { codigo_municipio: "010", municipio_consultado: "AMONTADA", numero_licitacao: "PE 01/2025", data_realizacao_licitacao: "2025-03-15", cnpj: "12345678000190", empresa: "=Fornecedor", porte_empresa: "Microempresa (ME)", municipio_empresa: "AMONTADA", uf_empresa: "CE", valor_total_vencido: "123.45", quantidade_itens_vencidos: 2 };
  const expense = { codigo_natureza: "30", nome_natureza: "Material de consumo", valor_total_dotacao: "1000.00", quantidade_dotacoes: 2, quantidade_licitacoes: 1 };
  const nature = { codigo_natureza: "30", nome_natureza: "Material de consumo", quantidade_licitacoes: 4, licitacoes_com_me: 1, percentual_licitacoes_com_me: 25, quantidade_participacoes: 10, participacoes_me: 2, percentual_participacoes_me: 20, valor_vencido: "500.00", valor_vencido_me: "123.45", percentual_valor_vencido_me: 24.69 };
  catalogApi.defaults.adapter = async config => ({ config, status: 200, statusText: "OK", headers: {}, data: { data: [{ codigo_municipio: "010", codigo_ibge: "2300754", nome: "Amontada", uf: "CE" }] } });
  api.defaults.adapter = async config => {
    if (config.url === "/municipios") return { config, status: 200, statusText: "OK", headers: {}, data: [{ id: 2300754, nome: "Amontada" }] };
    calls.push({ url: config.url, params: config.params });
    let data: unknown;
    switch (config.url) {
      case "/analytics/gastos-por-natureza":
        if (failExpenses) throw new Error("Sem conexão");
        data = { data: [expense, { ...expense, codigo_natureza: "39", valor_total_dotacao: "2000.00" }], metrica: "dotacao", observacao: "Não representa pagamento efetivo." }; break;
      case "/analytics/participacao-me-por-natureza":
        data = { data: [nature], associacao: "licitacao", observacao: "Valores podem aparecer em mais de uma natureza." }; break;
      case "/analytics/microempresas":
        if (failMicro) throw new Error("Indisponível");
        data = { data: { quantidade_microempresas: 1, quantidade_licitacoes: 1, quantidade_participacoes: 2, valor_total_vencido: "123.45", quantidade_itens_vencidos: 2 }, porte_considerado: ["ME"] }; break;
      case "/analytics/participacoes-me-locais":
        data = { limit: config.params.limit, offset: 0, data: [row], resumo: { valor_vencido_me_local: "50.00", percentual_valor_vencido_me_local: 10 } }; break;
      case "/analytics/participacoes-me-gerais":
        data = { limit: config.params.limit, offset: config.params.offset, data: Array.from({ length: Math.max(0, Math.min(config.params.limit, 101 - config.params.offset)) }, () => row), resumo: { participacoes_me: 101, valor_vencido_me: "123.45", percentual_valor_vencido_me: 24.69 } }; break;
      default: throw new Error(`Endpoint indevido na análise: ${config.url}`);
    }
    return { config, status: 200, statusText: "OK", headers: {}, data };
  };
  const filters = { municipalityIbge: "2300754", natureCode: "30", year: 2025, page: 1, pageSize: 100 };
  const data = await loadAnalysisData(filters);
  assert.equal(data.hasNext, true);
  assert.equal(data.bids.data?.data.length, 100);
  assert.equal(data.micro.data?.data.valor_total_vencido, "123.45");
  assert.equal(data.local.data?.resumo.valor_vencido_me_local, "50.00");
  assert.equal(data.general.data?.resumo.percentual_valor_vencido_me, 24.69);
  assert.equal(calls.length, 5);
  const period = { codigo_municipio: "010", data_inicio: "2025-01-01", data_fim: "2025-12-31" };
  for (const url of ["/analytics/gastos-por-natureza", "/analytics/participacao-me-por-natureza"]) assert.deepEqual(calls.find(c => c.url === url)?.params, period);
  assert.deepEqual(calls.find(c => c.url === "/analytics/microempresas")?.params, { ...period, codigo_natureza: "30" });
  for (const c of calls.filter(c => c.url?.includes("participacoes-me-"))) {
    assert.equal(c.params.ano, 2025);
    assert.equal(c.params.codigo_municipio, "010");
    assert.equal(c.params.codigo_natureza, "30");
  }
  // Gráficos usam o campo da sua métrica, sem preencher naturezas ou percentuais ausentes.
  assert.equal(selectAnalysisExpenses(data.expenses.data!.data, "30")[0].valor_total_dotacao, "1000.00");
  assert.equal(selectAnalysisParticipation(data.participation.data!.data, "30")[0].valor_vencido_me, "123.45");
  assert.deepEqual(selectAnalysisExpenses([], "30"), []);
  assert.deepEqual(selectAnalysisParticipation([nature], "39"), []);
  assert.equal(selectAnalysisPercentages([{ ...nature, percentual_participacoes_me: null }, { ...nature, codigo_natureza: "39", percentual_participacoes_me: 0 }]).length, 1);
  assert.equal((await loadAnalysisData({ ...filters, page: 2 })).hasNext, false);
  const before = calls.length;
  assert.ok((await loadAnalysisData({ ...filters, municipalityIbge: "9999999" })).micro.error);
  assert.equal(calls.length, before, "município inválido não amplia a consulta");
  calls.length = 0;
  await loadAnalysisData({ ...filters, municipalityIbge: undefined });
  assert.equal(calls.length, 3, "sem município somente operações que suportam consulta geral");
  assert.ok(calls.every(c => !c.url?.includes("participacoes-me-")));
  const response = await GET(new Request("http://localhost/analise/exportar?tipo=licitacoes&municipio=2300754&ano=2025&natureza=30"));
  assert.equal(response.status, 200);
  const csv = await response.text();
  assert.match(csv, /Valor vencido/);
  assert.doesNotMatch(csv, /Valor pago/);
  assert.match(csv, /123,45/);
  assert.match(csv, /'=Fornecedor/);
  assert.equal(csv.trim().split("\r\n").length, 102);
  assert.equal((await GET(new Request("http://localhost/analise/exportar?tipo=licitacoes"))).status, 400);
  failExpenses = true;
  const partial = await loadAnalysisData(filters);
  assert.ok(partial.expenses.error);
  assert.equal(partial.expenses.data, null);
  assert.equal(partial.micro.data?.data.valor_total_vencido, "123.45");
  assert.ok(partial.local.data);
  failMicro = true;
  const failedMicro = await loadAnalysisData(filters);
  assert.equal(failedMicro.micro.data, null);
  assert.ok(failedMicro.micro.error);
  assert.ok(failedMicro.bids.data, "falha do indicador não esconde tabela de vencedoras");
});
