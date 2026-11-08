import assert from "node:assert/strict";
import test from "node:test";
import fastify from "fastify";
import { AxiosError } from "axios";
import { analyticsApi } from "../src/lib/axios/analytics-api";
import { analyticsRoutes } from "../src/modules/analytics/analytics.routes";
import { errorHandling } from "../src/middlewares/error-handling";

// Exercita rotas, validação Zod, encaminhamento e cache sem depender da rede.
test("pagamentos: contrato, filtros, cache, validação e falhas", async () => {
  const app = fastify();
  app.setValidatorCompiler(() => () => true);
  app.setSerializerCompiler(() => data => JSON.stringify(data));
  app.setErrorHandler(errorHandling);
  app.register(analyticsRoutes);
  const calls: Array<{ url?: string; params: Record<string, unknown> }> = [];
  const summary = { total_controle: "100.00", total_me: "25.00", percentual_me: 25, coleta: { coleta_id: 14 }, data: [], pendencias: [], observacao: "Fonte" };
  analyticsApi.defaults.adapter = async config => {
    calls.push({ url: config.url, params: config.params });
    if (config.params.ano === 2024) throw new AxiosError("upstream", "ERR_BAD_REQUEST", config, null, { status: 422, data: {}, headers: {}, statusText: "Unprocessable", config });
    return { status: 200, statusText: "OK", headers: {}, config, data: config.url?.endsWith("resumo") ? summary : { limit: config.params.limit, offset: config.params.offset, coleta_id: 14, data: [] } };
  };
  try {
    const url = "/analytics/pagamentos/resumo?codigo_municipio=010&ano=2025";
    assert.equal((await app.inject(url)).statusCode, 200);
    assert.deepEqual((await app.inject(url)).json(), summary);
    assert.equal(calls.length, 1, "resumo deve ser cacheado");
    assert.deepEqual(calls[0], { url: "/analytics/pagamentos/resumo", params: { codigo_municipio: "010", ano: 2025 } });
    const suppliers = await app.inject("/analytics/pagamentos/fornecedores?codigo_municipio=010&ano=2025&coleta_id=14&codigo_natureza=30&categoria_porte=&limit=100&offset=100");
    assert.equal(suppliers.statusCode, 200);
    assert.deepEqual(calls[1].params, { codigo_municipio: "010", ano: 2025, coleta_id: 14, codigo_natureza: "30", categoria_porte: "", limit: 100, offset: 100 });
    await app.inject("/analytics/pagamentos/fornecedores?codigo_municipio=010&ano=2025");
    assert.equal(calls[2].params.categoria_porte, "ME");
    for (const query of ["ano=2025", "codigo_municipio=6&ano=2025", "codigo_municipio=010&ano=1999", "codigo_municipio=010&ano=2025&limit=101", "codigo_municipio=010&ano=2025&coleta_id=0", "codigo_municipio=010&ano=2025&offset=-1"]) {
      assert.equal((await app.inject(`/analytics/pagamentos/fornecedores?${query}`)).statusCode, 400, query);
    }
    assert.equal((await app.inject("/analytics/pagamentos/resumo?codigo_municipio=010&ano=2024")).statusCode, 502);
  } finally { await app.close(); }
});

test("/analise: encaminha cada métrica para sua operação e preserva as observações de natureza", async () => {
  const app = fastify();
  app.setValidatorCompiler(() => () => true);
  app.setSerializerCompiler(() => data => JSON.stringify(data));
  app.setErrorHandler(errorHandling);
  app.register(analyticsRoutes);
  const calls: Array<{ url?: string; params: Record<string, unknown> }> = [];
  const payload = { data: [], associacao: "licitacao", observacao: "Valores repetidos por natureza." };
  analyticsApi.defaults.adapter = async config => {
    calls.push({ url: config.url, params: config.params });
    return { status: 200, statusText: "OK", headers: {}, config, data: payload };
  };
  try {
    for (const path of ["gastos-por-natureza", "participacao-me-por-natureza", "microempresas"]) {
      const response = await app.inject(`/analytics/${path}?codigo_municipio=010&data_inicio=2025-01-01&data_fim=2025-12-31`);
      assert.equal(response.statusCode, 200);
      assert.equal(calls.at(-1)?.url, `/analytics/${path}`);
      assert.deepEqual(calls.at(-1)?.params, { codigo_municipio: "010", data_inicio: "2025-01-01", data_fim: "2025-12-31" });
      assert.equal(response.json().observacao, payload.observacao);
    }
    for (const path of ["participacoes-me-locais", "participacoes-me-gerais"]) {
      const response = await app.inject(`/analytics/${path}?codigo_municipio=010&ano=2025&codigo_natureza=30&limit=100&offset=100`);
      assert.equal(response.statusCode, 200);
      assert.equal(calls.at(-1)?.url, `/analytics/${path}`);
      assert.deepEqual(calls.at(-1)?.params, { codigo_municipio: "010", ano: 2025, codigo_natureza: "30", limit: 100, offset: 100 });
    }
    assert.equal((await app.inject("/analytics/gastos-por-natureza?data_inicio=2025-12-31&data_fim=2025-01-01")).statusCode, 400);
  } finally { await app.close(); }
});
