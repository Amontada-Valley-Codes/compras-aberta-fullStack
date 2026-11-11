import assert from "node:assert/strict";
import test from "node:test";
import { api } from "../src/api/client";
import {
  getDashboardData,
  getSupplierSummaries,
  summarizeSupplierPayments,
  type MunicipalitySummary,
} from "../src/features/dashboard/gestor-publico/gestor-publico-data";
import type { PaymentSupplier } from "../src/services/analytics/payments.types";

const municipality = (id: string, collectionId: number): MunicipalitySummary => ({
  id, tceCode: id.padStart(3, "0"), name: `Municipio ${id}`, region: "CE", collectionId,
  updatedAt: "2026-11-01T12:00:00Z", total: 100, mpeValue: 20, mpePercent: 20,
  localValue: 10, localPercent: 10, suppliers: 1,
  natures: { "30": 100 }, meNatures: { "30": 20 }, localNatures: { "30": 10 },
  localSuppliersByNature: { "30": 1 },
});

const payment = (patch: Partial<PaymentSupplier> = {}): PaymentSupplier => ({
  documento: "12345678000190", tipo_documento: "CNPJ", nome_negociante: "Fornecedor",
  codigo_natureza: "30", nome_natureza: "Material de consumo", categoria_porte: "ME",
  situacao_classificacao: "Classificado", quantidade_pagamentos: 2, valor_pago: "10.00",
  ...patch,
});

test("supplier detail: reuse complete pages, preserve collection metadata and reject partial data", async (t) => {
  const originalAdapter = api.defaults.adapter;
  const calls: Array<{ url?: string; params: Record<string, unknown> }> = [];
  let mode = "ok";
  api.defaults.adapter = async (config) => {
    const params = config.params;
    calls.push({ url: config.url, params });
    let data;
    if (config.url === "/analytics/participacoes-me-locais") {
      data = { offset: params.offset, coleta_id: params.coleta_id, data: [{ documento: "12345678000190" }] };
    } else if (config.url === "/analytics/pagamentos/fornecedores") {
      if (mode === "failure" && params.offset === 100) throw new Error("Second page unavailable");
      const rows = params.codigo_municipio === "001"
        ? params.offset === 0
          ? [payment(), ...Array.from({ length: 99 }, (_, i) => payment({ documento: `other-${i}`, valor_pago: "1.00", quantidade_pagamentos: 1 }))]
          : [payment({ documento: "12.345.678/0001-90", codigo_natureza: "39", nome_natureza: "Servicos", valor_pago: "20.00", quantidade_pagamentos: 3 })]
        : [payment({ valor_pago: "30.00", quantidade_pagamentos: 4, categoria_porte: "EPP", situacao_classificacao: "Outra classificacao" })];
      data = {
        offset: mode === "offset" ? params.offset + 1 : params.offset,
        coleta_id: mode === "collection" ? 999 : params.coleta_id,
        data: mode === "invalid" ? [payment({ valor_pago: "invalid" })] : rows,
      };
    } else throw new Error(`Unexpected endpoint: ${config.url}`);
    return { config, data, status: 200, statusText: "OK", headers: {} };
  };
  try {
    const a = municipality("1", 71);
    const b = municipality("2", 72);
    await t.test("aggregate municipality/nature rows once, without modal requests", async () => {
      const suppliers = await getSupplierSummaries([a, b], 2026);
      const supplier = suppliers.find((row) => row.cnpj === "12345678000190")!;
      assert.equal(supplier.total, 60);
      assert.equal(supplier.municipalitiesServed, 2);
      assert.equal(supplier.municipalityId, "");
      assert.equal(supplier.nature, "varias");
      assert.equal(supplier.paymentDetails?.rows.length, 3);
      const before = calls.length;
      for (let opening = 0; opening < 3; opening++) {
        const detail = summarizeSupplierPayments(supplier, 2026)!;
        assert.equal(detail.total, 60);
        assert.equal(detail.payments, 9);
        assert.equal(detail.total / detail.payments, 60 / 9);
        assert.deepEqual(detail.natures.map(([code, row]) => [code, row.total, row.payments]), [["30", 40, 6], ["39", 20, 3]]);
        assert.deepEqual(detail.cities.map(({ municipality: city, total, payments }) => [city.id, city.collectionId, city.updatedAt, total, payments]), [
          ["1", 71, a.updatedAt, 30, 5], ["2", 72, b.updatedAt, 30, 4],
        ]);
      }
      assert.equal(calls.length, before, "reopening details must not fetch any pages");
      assert.equal(summarizeSupplierPayments(supplier, 2025), null);
      assert.equal(summarizeSupplierPayments({ ...supplier, paymentDetails: undefined }, 2026), null);
      assert.equal(supplier.paymentDetails?.rows[2].payment.categoria_porte, "EPP");
      assert.equal(supplier.paymentDetails?.rows[2].payment.situacao_classificacao, "Outra classificacao");
      assert.equal(await getSupplierSummaries([b, a], 2026), suppliers, "same collection scope is cached");
      assert.equal(calls.length, before);
      const supplierCalls = calls.filter((call) => call.url?.endsWith("fornecedores"));
      assert.equal(supplierCalls.length, 3);
      assert.ok(supplierCalls.some((call) => call.params.offset === 100));
      assert.ok(supplierCalls.every((call) => call.params.ano === 2026 && call.params.categoria_porte === "" && call.params.limit === 100));
    });

    await t.test("municipality filter carries only its own rows; collection changes invalidate cache", async () => {
      const filtered = (await getSupplierSummaries([a], 2026)).find((row) => row.cnpj === "12345678000190")!;
      assert.equal(filtered.total, 30);
      assert.equal(filtered.municipalitiesServed, 1);
      assert.equal(filtered.municipalityId, a.id);
      assert.equal(filtered.paymentDetails?.rows.length, 2);
      assert.deepEqual(summarizeSupplierPayments(filtered, 2026)?.cities.map((row) => row.municipality.id), [a.id]);
      const before = calls.length;
      const refreshed = (await getSupplierSummaries([{ ...a, collectionId: 73 }], 2026)).find((row) => row.cnpj === "12345678000190")!;
      assert.ok(calls.length > before);
      assert.ok(refreshed.paymentDetails?.rows.every((row) => row.municipality.collectionId === 73));
      assert.ok(filtered.paymentDetails?.rows.every((row) => row.municipality.collectionId === 71));
    });

    for (const [index, failure] of ["failure", "collection", "offset", "invalid"].entries()) {
      await t.test(`reject ${failure} without caching partial summaries; retry succeeds`, async () => {
        mode = failure;
        const scope = [{ ...a, collectionId: 80 + index }];
        await assert.rejects(getSupplierSummaries(scope, 2026));
        mode = "ok";
        const retried = (await getSupplierSummaries(scope, 2026)).find((row) => row.cnpj === "12345678000190")!;
        assert.equal(retried.total, 30);
        assert.equal(retried.paymentDetails?.rows.length, 2);
      });
    }
  } finally {
    api.defaults.adapter = originalAdapter;
  }
});

test("dashboard: absent nature amounts contribute zero to union and selected nature", () => {
  const a = municipality("1", 91);
  const b = { ...municipality("2", 92), total: 50, mpeValue: 0, localValue: 0, natures: { "39": 50 }, meNatures: {}, localNatures: {}, localSuppliersByNature: {} };
  const filters = { municipalities: [], year: 2026, nature: "" };
  const union = getDashboardData(filters, [a, b]);
  assert.deepEqual(union.natures.map((row) => [row.code, row.value, row.mpeValue]), [["30", 100, 20], ["39", 50, 0]]);
  assert.equal(union.totals.total, 150);
  assert.equal(union.totals.mpeValue, 20);
  assert.equal(union.totals.localValue, 10);
  const selected = getDashboardData({ ...filters, nature: "39" }, [a, b]);
  assert.equal(selected.totals.total, 50);
  assert.equal(selected.totals.mpeValue, 0);
  assert.equal(selected.totals.localValue, 0);
  assert.equal(selected.allMunicipalities[0].total, 0);
  assert.equal(selected.natures[0].value, 50);
  const absent = getDashboardData({ ...filters, nature: "52" }, [a, b]);
  assert.equal(absent.totals.total, 0);
  assert.equal(absent.totals.mpeValue, 0);
  assert.equal(absent.totals.localValue, 0);
  assert.equal(absent.natures[0].value, 0);
});
