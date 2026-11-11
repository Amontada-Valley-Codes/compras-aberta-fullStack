import assert from "node:assert/strict";
import test from "node:test";
import { api } from "../src/api/client";
import { loadMunicipalityDetailData } from "../src/features/dashboard/gestor-publico/municipality-detail-data";
import { buildDetailNatureRows, buildDetailHistory, buildDetailSuppliers } from "../src/features/dashboard/gestor-publico/municipality-detail-model";

test("detalhe municipal: pagamentos de todos os portes, histórico, coleta fixa e falha sem totais parciais", async () => {
  const calls: Array<{ url?: string; params: Record<string, unknown> }> = [];
  let failPage = false;
  let invalid = false;
  api.defaults.adapter = async config => {
    const params = config.params;
    if (config.url === "/municipios") return { config, status: 200, statusText: "OK", headers: {}, data: [{ id: 2300754, nome: "Amontada" }] };
    if (config.url === "/analytics/municipios") return { config, status: 200, statusText: "OK", headers: {}, data: { data: invalid ? [] : [{ codigo_municipio: "010", codigo_ibge: "2300754", nome: "Amontada", uf: "CE" }] } };
    calls.push({ url: config.url, params });
    let data;
    if (config.url === "/analytics/pagamentos/resumo") {
      if (params.ano === 2024) throw new Error("Sem coleta");
      data = { coleta: { coleta_id: params.ano }, data: [{ codigo_natureza: "30", nome_natureza: "Material de consumo", total_controle: params.ano === 2025 ? "1010.00" : "0.00", valor_me: "200.00", percentual_me: 19.8, quantidade_pagamentos: 101 }], total_controle: "1010.00", total_me: "200.00", percentual_me: 19.8, pendencias: [] };
    } else if (config.url === "/analytics/pagamentos/fornecedores") {
      if (failPage && params.offset > 0) throw new Error("Página indisponível");
      const total = params.categoria_porte === "ME" ? 20 : 101;
      data = { coleta_id: params.coleta_id, limit: params.limit, offset: params.offset, data: Array.from({ length: Math.max(0, Math.min(params.limit, total - params.offset)) }, (_, i) => ({ codigo_natureza: i % 2 ? "30" : "39", nome_natureza: "Natureza", documento: params.offset + i < 20 ? "12345678000190" : "98765432000109", tipo_documento: "CNPJ", nome_negociante: "Fornecedor", categoria_porte: params.offset + i < 20 ? "ME" : "EPP", quantidade_pagamentos: 1, valor_pago: "10.00" })) };
    } else if (config.url === "/analytics/participacoes-me-locais") {
      data = { limit: 100, offset: 0, coleta_id: params.coleta_id, ano: params.ano, data: [{ codigo_municipio: "010", codigo_natureza: "30", categoria_porte: "ME" }], resumo: { total_fornecedores: 20, fornecedores_me_locais: 1, percentual_fornecedores_me_locais: 5, total_pagamentos: 101, pagamentos_me_locais: 1, percentual_pagamentos_me_locais: 1, total_controle: "1010.00", valor_pago_me_local: "200.00", percentual_valor_pago_me_local: 19.8 } };
    } else throw new Error(`Endpoint antigo acionado: ${config.url}`);
    return { config, status: 200, statusText: "OK", headers: {}, data };
  };
  const data = await loadMunicipalityDetailData("2300754", 2025);
  assert.equal(data.suppliers.data?.length, 101);
  assert.ok(calls.every(call => ["/analytics/pagamentos/resumo", "/analytics/pagamentos/fornecedores", "/analytics/participacoes-me-locais"].includes(call.url ?? "")), "nenhum endpoint financeiro legado pode alimentar o detalhe");
  assert.equal(calls.filter(call => call.url?.endsWith("resumo") && call.params.ano === 2025).length, 1, "reutilizar a coleta selecionada no histórico");
  assert.ok(calls.some(call => call.params.offset === 100 && call.params.limit === 100));
  for (const call of calls.filter(call => call.url?.endsWith("fornecedores"))) {
    assert.equal(call.params.coleta_id, 2025);
    assert.ok(call.params.categoria_porte === "" || call.params.categoria_porte === "ME");
  }
  assert.equal(buildDetailNatureRows(data)[0].value, 1010);
  assert.deepEqual(buildDetailHistory(data, "30").map(item => item.value), [null, 1010, 0]);
  const suppliers = buildDetailSuppliers(data);
  assert.equal(suppliers.length, 2, "não duplicar o fornecedor entre naturezas");
  assert.equal(suppliers.reduce((sum, row) => sum + row.total, 0), 1010);
  assert.equal(suppliers.reduce((sum, row) => sum + row.payments, 0), 101);
  assert.equal(data.analysis.local.data?.localAmount, "200.00");
  assert.equal(data.analysis.local.data?.localSuppliers, 1);
  assert.equal(suppliers[0].identified, true);
  assert.equal(suppliers[0].size, "EPP");
  failPage = true;
  const failed = await loadMunicipalityDetailData("2300754", 2025);
  assert.equal(failed.suppliers.data, null);
  assert.ok(failed.suppliers.error);
  assert.equal(failed.analysis.payments.data?.total_controle, "1010.00");
  invalid = true;
  const before = calls.length;
  assert.equal((await loadMunicipalityDetailData("9999999", 2025)).analysis.selectedMunicipality, null);
  assert.equal(calls.length, before);
});
