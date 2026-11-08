import assert from "node:assert/strict";
import test from "node:test";
import { api, catalogApi } from "../src/api/client";
import { loadMunicipalityDetailData } from "../src/features/dashboard/gestor-publico/municipality-detail-data";
import { buildDetailNatureRows, buildDetailHistory, buildDetailWinners } from "../src/features/dashboard/gestor-publico/municipality-detail-model";

test("detalhe municipal: bases reais distintas, paginação completa, cobertura e falhas sem zeros artificiais", async () => {
  const requests: Array<{ url?: string; params: Record<string, unknown> }> = [];
  let failNextPage = false;
  let failExpenses = false;
  let invalidCity = false;
  catalogApi.defaults.adapter = async config => ({ config, status: 200, statusText: "OK", headers: {}, data: { data: invalidCity ? [] : [{ codigo_municipio: "010", codigo_ibge: "2300754", nome: "Amontada", uf: "CE" }] } });
  api.defaults.adapter = async config => {
    const params = config.params;
    if (config.url === "/municipios") return { config, status: 200, statusText: "OK", headers: {}, data: [{ id: 2300754, nome: "Amontada" }] };
    requests.push({ url: config.url, params });
    let data;
    if (config.url === "/analytics/gastos-por-natureza") {
      if (failExpenses) throw new Error("Falha na fonte");
      data = { data: [], metrica: "dotacao", observacao: "Não é pagamento." };
    } else if (config.url === "/analytics/participacao-me-por-natureza") {
      data = { data: [], associacao: "licitacao", observacao: "Sem vínculo" };
    } else if (config.url === "/analytics/microempresas") {
      data = { data: { quantidade_microempresas: 1, quantidade_participacoes: 101, valor_total_vencido: "1010.00" } };
    } else if (config.url === "/analytics/participacoes-me-locais") {
      data = { data: [], resumo: { valor_vencido_me_local: "1010.00", percentual_valor_vencido_me_local: 50.5 } };
    } else if (config.url === "/analytics/participacoes-me-gerais") {
      if (failNextPage && params.offset > 0) throw new Error("Página indisponível");
      const rows = Array.from({ length: Math.max(0, Math.min(params.limit, 101 - params.offset)) }, (_, index) => ({ codigo_municipio: "010", municipio_consultado: "AMONTADA", numero_licitacao: `PE${params.offset + index}`, cnpj: "12345678000190", empresa: "Empresa ME", porte_empresa: "ME", municipio_empresa: "AMONTADÁ", uf_empresa: "CE", valor_total_vencido: "10.00", data_realizacao_licitacao: "2025-01-15", quantidade_itens_vencidos: 1 }));
      data = { data: rows, limit: params.limit, offset: params.offset, resumo: { participacoes_me: 101, valor_total_vencido: "2000.00", valor_vencido_me: "1010.00", percentual_valor_vencido_me: 50.5 } };
    } else if (config.url === "/analytics/pagamentos/resumo") {
      if (params.ano === 2024) throw new Error("Sem coleta neste exercício");
      data = { coleta: { coleta_id: params.ano }, data: [{ codigo_natureza: "30", nome_natureza: "Material de consumo", total_controle: params.ano === 2025 ? "500.00" : "0.00", valor_me: "0.00" }], total_controle: "500.00", total_me: "0.00", observacao: "Pagamentos" };
    } else throw new Error(`Operação inesperada: ${config.url}`);
    return { config, status: 200, statusText: "OK", headers: {}, data };
  };
  const data = await loadMunicipalityDetailData("2300754", 2025);
  assert.equal(data.analysis.selectedMunicipality?.tceCode, "010");
  assert.equal(data.winners.data?.length, 101);
  assert.ok(requests.some(item => item.url?.endsWith("participacoes-me-gerais") && item.params.offset === 100));
  assert.ok(requests.every(item => item.params.codigo_municipio === "010"));
  assert.deepEqual(buildDetailNatureRows(data, "dotacoes"), [], "dotação vazia não pode usar valores pagos como substituto");
  assert.equal(buildDetailNatureRows(data, "pagamentos")[0].value, 500);
  assert.deepEqual(buildDetailHistory(data, "pagamentos", "30").map(item => item.value), [null, 500, 0], "falha de cobertura é null; zero informado pela fonte é zero");
  assert.deepEqual(buildDetailHistory(data, "dotacoes", "30").map(item => item.value), [null, null, null]);
  const model = buildDetailWinners(data);
  assert.equal(model.suppliers.length, 1);
  assert.equal(model.suppliers[0].origin, "Local");
  assert.equal(model.suppliers[0].total, 1010);
  assert.equal(model.monthly[0], 1010);
  assert.equal(model.monthly.reduce((sum, value) => sum + value, 0), 1010);
  failNextPage = true;
  const partial = await loadMunicipalityDetailData("2300754", 2025);
  assert.equal(partial.winners.data, null, "paginação com falha não deve exibir totais parciais como completos");
  assert.ok(partial.winners.error);
  assert.equal(partial.analysis.general.data?.resumo.valor_vencido_me, "1010.00");
  failExpenses = true;
  const failedExpenses = await loadMunicipalityDetailData("2300754", 2025);
  assert.equal(failedExpenses.history.find(item => item.year === 2025)?.expenses.data, null);
  assert.equal(buildDetailNatureRows(failedExpenses, "pagamentos")[0].value, 500, "falha em dotações não derruba pagamentos");
  invalidCity = true;
  const before = requests.length;
  const invalid = await loadMunicipalityDetailData("9999999", 2025);
  assert.equal(invalid.analysis.selectedMunicipality, null);
  assert.equal(requests.length, before, "município inválido não deve ampliar consulta");
});
