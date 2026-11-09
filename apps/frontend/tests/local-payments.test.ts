import assert from "node:assert/strict";
import test from "node:test";
import { calculateLocalPayments } from "../src/services/analytics/local-payments";
import type { PaymentSupplier } from "../src/services/analytics/payments.types";

const payment = (documento: string, valor_pago: string, codigo_natureza = "30"): PaymentSupplier => ({ documento, valor_pago, codigo_natureza, categoria_porte: "ME", tipo_documento: "CNPJ", quantidade_pagamentos: 1 });
test("ME locais: valores pagos em centavos, sede por CNPJ e município/UF, desconhecidos e deduplicação", () => {
  const directory = new Map([
    ["11111111000111", { municipio_empresa: "AMONTADÁ", uf_empresa: "ce" }],
    ["22222222000122", { municipio_empresa: "Amontada", uf_empresa: "SP" }],
    ["33333333000133", { municipio_empresa: "Fortaleza", uf_empresa: "CE" }],
  ]);
  const rows = [payment("11111111000111", "0.01"), payment("11111111000111", "0.02", "39"), payment("22222222000122", "2.00"), payment("33333333000133", "3.00"), payment("44444444000144", "5.00")];
  const result = calculateLocalPayments(rows, directory, "Amontada", "CE", "20.00", "10.03");
  assert.equal(result.localAmount, "0.03");
  assert.equal(result.mePayments, 5, "contar pagamentos, não fornecedores únicos");
  assert.equal(result.externalAmount, "5.00");
  assert.equal(result.unknownAmount, "5.00");
  assert.equal(result.localSuppliers, 1);
  assert.equal(result.knownSuppliers, 3);
  assert.equal(result.unknownSuppliers, 1);
  assert.equal(result.percentage, 0.15);
  assert.throws(() => calculateLocalPayments(rows.slice(1), directory, "Amontada", "CE", "20.00", "10.03"), /reconciliam/);
  assert.throws(() => calculateLocalPayments([{ ...rows[0], categoria_porte: "EPP" }], directory, "Amontada", "CE", "20.00", "0.01"), /porte divergente/);
  const unknown = calculateLocalPayments([payment("44444444000144", "5.00")], new Map(), "Amontada", "CE", "20.00", "5.00");
  assert.equal(unknown.percentage, null, "sem nenhuma sede conhecida não mostrar zero local como informação completa");
  assert.equal(calculateLocalPayments([], new Map(), "Amontada", "CE", "20.00", "0.00").percentage, 0);
  assert.equal(calculateLocalPayments([], new Map(), "Amontada", "CE", "0.00", "0.00").percentage, null);
});
