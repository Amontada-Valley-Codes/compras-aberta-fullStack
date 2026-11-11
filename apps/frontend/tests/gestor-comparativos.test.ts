import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import type { MunicipalitySummary } from "../src/features/dashboard/gestor-publico/gestor-publico-data";

// Load the page's pure calculations without booting Next or browser-only charts.
const source = ts.createSourceFile("comparison.tsx", readFileSync("src/features/dashboard/gestor-publico/GestorPublicoComparativos.tsx", "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const functions = source.statements.filter((node) => ts.isFunctionDeclaration(node) && ["toRow", "stateReference", "paymentComposition"].includes(node.name?.text ?? "")).map((node) => node.getText(source)).join("\n");
type ComparisonRow = Pick<MunicipalitySummary, "id" | "name" | "total" | "mpeValue" | "localValue" | "mpePercent" | "localPercent" | "suppliers" | "natures" | "updatedAt">;
const model = runInNewContext(ts.transpileModule(`${functions}\n({ toRow, stateReference, paymentComposition });`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText) as {
  toRow: (summary: MunicipalitySummary, nature: string) => ComparisonRow;
  stateReference: (rows: ComparisonRow[]) => Record<string, number> & { natures: Record<string, number> };
  paymentComposition: (row: ComparisonRow) => { local: number; otherMe: number; otherSizes: number; clamped: boolean };
};
const summary: MunicipalitySummary = {
  id: "1", tceCode: "001", name: "Municipio A", region: "CE", collectionId: 12,
  total: 100, mpeValue: 40, mpePercent: 40, localValue: 10, localPercent: 10,
  suppliers: 7, updatedAt: "2026-11-10T12:00:00Z",
  natures: { "30": 20 }, meNatures: { "30": 8 }, localNatures: { "30": 4 }, localSuppliersByNature: { "30": 2 },
};

test("comparison scopes local suppliers and payments to the selected nature", () => {
  const row = model.toRow(summary, "30");
  assert.equal(row.total, 20);
  assert.equal(row.mpeValue, 8);
  assert.equal(row.localValue, 4);
  assert.equal(row.mpePercent, 40);
  assert.equal(row.localPercent, 20);
  assert.equal(row.suppliers, 2);
  assert.equal(row.updatedAt, summary.updatedAt);
  assert.equal(model.toRow(summary, "").suppliers, 7);
});

test("missing nature and empty reference yield finite zero values", () => {
  const row = model.toRow(summary, "99");
  for (const key of ["total", "mpeValue", "localValue", "mpePercent", "localPercent", "suppliers"] as const) assert.equal(row[key], 0);
  const reference = model.stateReference([]);
  for (const key of ["total", "mpeValue", "localValue", "mpePercent", "localPercent", "suppliers"]) assert.equal(reference[key], 0);
});

test("reference weights percentages by payments and averages monetary and supplier values", () => {
  const reference = model.stateReference([
    model.toRow(summary, ""),
    model.toRow({ ...summary, total: 300, mpeValue: 30, localValue: 6, suppliers: 3 }, ""),
  ]);
  assert.equal(reference.total, 200);
  assert.equal(reference.mpeValue, 35);
  assert.equal(reference.localValue, 8);
  assert.equal(reference.mpePercent, 17.5);
  assert.equal(reference.localPercent, 4);
  assert.equal(reference.suppliers, 5);
  assert.equal(reference.natures["30"], 20);
});

test("sub-real totals are not clamped when calculating reference percentages", () => {
  const reference = model.stateReference([model.toRow({ ...summary, total: 0.5, mpeValue: 0.25, localValue: 0.1 }, "")]);
  assert.equal(reference.mpePercent, 50);
  assert.equal(reference.localPercent, 20);
});

test("payment composition partitions the existing totals without mutating them", () => {
  const row = model.toRow(summary, "");
  const composition = model.paymentComposition(row);
  assert.equal(composition.local, 10);
  assert.equal(composition.otherMe, 30);
  assert.equal(composition.otherSizes, 60);
  assert.equal(composition.clamped, false);
  assert.equal(composition.local + composition.otherMe + composition.otherSizes, row.total);
  assert.equal(row.mpeValue, 40);
  assert.equal(row.localValue, 10);
});

test("payment composition follows nature filters, including absent nature", () => {
  const composition = model.paymentComposition(model.toRow(summary, "30"));
  assert.equal(composition.local, 4);
  assert.equal(composition.otherMe, 4);
  assert.equal(composition.otherSizes, 12);
  const empty = model.paymentComposition(model.toRow(summary, "99"));
  assert.equal(empty.local + empty.otherMe + empty.otherSizes, 0);
  assert.equal(empty.clamped, false);
});

test("payment composition clamps negative components without rewriting API totals", () => {
  for (const values of [
    { total: 100, mpeValue: 40, localValue: 50, local: 50, otherMe: 0, otherSizes: 60 },
    { total: 20, mpeValue: 40, localValue: 10, local: 10, otherMe: 30, otherSizes: 0 },
    { total: -10, mpeValue: -5, localValue: -2, local: 0, otherMe: 0, otherSizes: 0 },
  ]) {
    const row = model.toRow({ ...summary, ...values }, "");
    const composition = model.paymentComposition(row);
    assert.equal(composition.local, values.local);
    assert.equal(composition.otherMe, values.otherMe);
    assert.equal(composition.otherSizes, values.otherSizes);
    assert.equal(composition.clamped, true);
    assert.equal(row.total, values.total);
  }
});
