import assert from "node:assert/strict";
import test from "node:test";
import { api } from "../src/api/client";
import { loadAnalysisData } from "../src/features/public-data/public-data";
import { selectPaymentNatures, selectPaymentTotals } from "../src/features/analysis/payment-selectors";
import { GET } from "../src/app/analise/exportar/route";
import { getDashboardData, type MunicipalitySummary } from "../src/features/dashboard/gestor-publico/gestor-publico-data";

test("Gestor Público: filtrar natureza recalcula mapa, participação e ME locais", () => {
  const city: MunicipalitySummary = {
    id: "2300754", tceCode: "010", name: "Amontada", region: "CE", total: 1200, mpeValue: 300, mpePercent: 25,
    localValue: 120, localPercent: 10, suppliers: 4, updatedAt: "2026-11-01", collectionId: 27,
    natures: { "30": 1000, "39": 200 }, meNatures: { "30": 200, "39": 100 }, localNatures: { "30": 80, "39": 40 },
    localSuppliersByNature: { "30": 2, "39": 1 },
  };
  const result = getDashboardData({ municipalities: [], year: 2026, nature: "30" }, [city]);
  assert.equal(result.totals.total, 1000);
  assert.equal(result.totals.mpeValue, 200);
  assert.equal(result.totals.localValue, 80);
  assert.equal(result.totals.suppliers, 2);
  assert.equal(result.allMunicipalities[0].mpePercent, 20);
  assert.equal(result.allMunicipalities[0].localPercent, 8);
  assert.equal(result.natures.length, 1);
});

test("/analise: somente pagamentos, mesma coleta, filtro de natureza, paginação e CSV", async () => {
  const calls: Array<{ url?: string; params: Record<string, unknown> }> = [];
  let municipalityCatalogParams: Record<string, unknown> = {};
  let failSummary = false;
  let wrongCollection = false;
  const row = { codigo_natureza: "30", nome_natureza: "Material de consumo", documento: "12345678000190", tipo_documento: "CNPJ", nome_negociante: "=Fornecedor", categoria_porte: "ME", valor_pago: "10.00", quantidade_pagamentos: 1 };
  api.defaults.adapter = async config => {
    if (config.url === "/municipios") return { config, status: 200, statusText: "OK", headers: {}, data: [{ id: 2300754, nome: "Amontada" }] };
    if (config.url === "/analytics/municipios") { municipalityCatalogParams = config.params ?? {}; return { config, status: 200, statusText: "OK", headers: {}, data: { data: [{ codigo_municipio: "010", codigo_ibge: "2300754", nome: "Amontada", uf: "CE" }] } }; }
    calls.push({ url: config.url, params: config.params });
    let data;
    if (config.url === "/analytics/pagamentos/resumo") {
      if (failSummary) throw new Error("Indisponível");
      data = { coleta: { coleta_id: 26 }, data: [{ codigo_natureza: "30", nome_natureza: "Material de consumo", total_controle: "2000.00", valor_me: "1010.00", percentual_me: 50.5, quantidade_pagamentos: 200 }], total_controle: "3000.00", total_me: "1010.00", percentual_me: 33.67, pendencias: [] };
    } else if (config.url === "/analytics/pagamentos/fornecedores") {
      data = { limit: config.params.limit, offset: config.params.offset, coleta_id: wrongCollection ? 99 : 26, data: Array.from({ length: Math.max(0, Math.min(config.params.limit, 101 - config.params.offset)) }, () => row) };
    } else if (config.url === "/analytics/participacoes-me-locais") {
      data = { limit: 100, offset: 0, coleta_id: 26, ano: 2025, data: [{ codigo_municipio: "010", codigo_natureza: "30", categoria_porte: "ME" }], resumo: { total_fornecedores: 1, fornecedores_me_locais: 1, percentual_fornecedores_me_locais: 100, total_pagamentos: 200, pagamentos_me_locais: 101, percentual_pagamentos_me_locais: 50.5, total_controle: "2000.00", valor_pago_me_local: "1010.00", percentual_valor_pago_me_local: 50.5 } };
    } else throw new Error(`Endpoint antigo acionado: ${config.url}`);
    return { config, status: 200, statusText: "OK", headers: {}, data };
  };
  const filters = { municipalityIbge: "2300754", natureCode: "30", year: 2025, page: 1, pageSize: 100 };
  const data = await loadAnalysisData(filters);
  assert.equal(data.hasNext, true);
  assert.equal(data.suppliers.data?.data.length, 100);
  assert.ok(calls.length >= 3);
  assert.deepEqual(municipalityCatalogParams, { uf: "CE", limit: 100, offset: 0 });
  assert.ok(calls.every(call => ["/analytics/pagamentos/resumo", "/analytics/pagamentos/fornecedores", "/analytics/participacoes-me-locais"].includes(call.url ?? "")));
  assert.equal(data.local.data?.localAmount, "1010.00");
  assert.equal(data.local.data?.percentage, 50.5);
  assert.equal(data.local.data?.localSuppliers, 1);
  assert.equal(data.local.data?.mePayments, 101);
  assert.ok(calls.some(call => call.url === "/analytics/participacoes-me-locais"));
  assert.deepEqual(calls[0].params, { codigo_municipio: "010", ano: 2025 });
  for (const call of calls.slice(1)) {
    if (call.url === "/analytics/participacoes-me-locais") {
      assert.equal(call.params.coleta_id, 26);
      assert.equal(call.params.codigo_natureza, "30");
      continue;
    }
    assert.equal(call.params.coleta_id, 26);
    assert.equal(call.params.codigo_natureza, "30");
    assert.equal(call.params.categoria_porte, "ME");
    assert.equal(call.params.codigo_municipio, "010");
  }
  const filtered = selectPaymentTotals(data.payments.data, "30");
  assert.equal(filtered.total, "2000.00");
  assert.equal(filtered.percentage, 50.5);
  assert.equal(filtered.payments, 200);
  assert.equal(selectPaymentTotals(data.payments.data).total, "3000.00");
  assert.equal(selectPaymentTotals(data.payments.data, "39").total, undefined);
  assert.deepEqual(selectPaymentNatures(null), []);
  assert.equal((await loadAnalysisData({ ...filters, page: 2 })).hasNext, false);
  const before = calls.length;
  for (const municipalityIbge of [undefined, "9999999"]) assert.equal((await loadAnalysisData({ ...filters, municipalityIbge })).payments.data, null);
  assert.equal(calls.length, before, "não ampliar consulta sem município válido");
  const response = await GET(new Request("http://localhost/analise/exportar?tipo=pagamentos&municipio=2300754&ano=2025&natureza=30"));
  assert.equal(response.status, 200);
  const csv = await response.text();
  assert.match(csv, /Valor pago/);
  assert.doesNotMatch(csv, /Valor vencido/);
  assert.match(csv, /'=Fornecedor/);
  assert.equal(csv.trim().split("\r\n").length, 102);
  assert.equal((await GET(new Request("http://localhost/analise/exportar?tipo=licitacoes"))).status, 400);
  wrongCollection = true;
  const mismatched = await loadAnalysisData(filters);
  assert.equal(mismatched.suppliers.data, null, "não comparar fornecedores de outra coleta");
  assert.ok(mismatched.suppliers.error);
  assert.equal(mismatched.local.data, null);
  assert.ok(mismatched.local.error);
  wrongCollection = false;
  failSummary = true;
  const failed = await loadAnalysisData(filters);
  assert.ok(failed.payments.error);
  assert.equal(failed.suppliers.data, null);
  assert.ok(failed.suppliers.error);
});
