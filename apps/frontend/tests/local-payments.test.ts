import assert from "node:assert/strict";
import test from "node:test";
import { api } from "../src/api/client";
import { loadLocalPayments } from "../src/services/analytics/local-payments";

test("ME locais: usa endpoint oficial com exercício, natureza e coleta dos pagamentos", async () => {
  const calls: Array<{ url?: string; params: Record<string, unknown> }> = [];
  api.defaults.adapter = async (config) => {
    calls.push({ url: config.url, params: config.params ?? {} });
    if (config.url === "/analytics/participacoes-me-locais") return { config, status: 200, statusText: "OK", headers: {}, data: {
      limit: 100, offset: 0, coleta_id: 27, ano: 2026,
      data: [{ codigo_municipio: "010", codigo_natureza: "39", categoria_porte: "ME" }],
      resumo: { total_fornecedores: 121, fornecedores_me_locais: 1, percentual_fornecedores_me_locais: 0.83, total_pagamentos: 2793, pagamentos_me_locais: 1, percentual_pagamentos_me_locais: 0.04, total_controle: "51448595.55", valor_pago_me_local: "5000.00", percentual_valor_pago_me_local: 0.01 },
    } };
    if (config.url === "/analytics/pagamentos/fornecedores") return { config, status: 200, statusText: "OK", headers: {}, data: { coleta_id: 27, offset: 0, limit: 100, data: [{ quantidade_pagamentos: 4 }, { quantidade_pagamentos: 3 }] } };
    throw new Error(`Endpoint inesperado ${config.url}`);
  };
  const result = await loadLocalPayments({ codigo_municipio: "010", ano: 2026, coleta_id: 27, codigo_natureza: "39" });
  assert.equal(result.localAmount, "5000.00");
  assert.equal(result.percentage, 0.01);
  assert.equal(result.localSuppliers, 1);
  assert.equal(result.localPaymentCount, 1);
  assert.equal(result.mePayments, 7);
  assert.equal(calls[0].url, "/analytics/participacoes-me-locais");
  assert.deepEqual(calls[0].params, { codigo_municipio: "010", ano: 2026, coleta_id: 27, codigo_natureza: "39", limit: 100, offset: 0 });
});
