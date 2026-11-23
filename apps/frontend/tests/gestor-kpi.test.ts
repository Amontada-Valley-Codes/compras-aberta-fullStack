import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicKpi } from "../src/features/dashboard/gestor-publico/GestorPublicoUI";
import { compactMoney, money } from "../src/features/public-data/format";

test("gestor: monetary indicators use compact amounts and retain exact accessible values", () => {
  for (const amount of [13747542781.44, 3494532601.44, 609627717.52, 1200, 0, null, undefined]) {
    const html = renderToStaticMarkup(createElement(PublicKpi, { icon: null, label: "Total", amount, detail: "Pagamentos" }));
    assert.ok(html.includes(`>${compactMoney(amount)}</strong>`));
    assert.ok(html.includes(`title="${money(amount)}"`));
    assert.ok(html.includes(`aria-label="${money(amount)}"`));
  }
});

test("gestor: percentages, counts and text are not abbreviated as currency", () => {
  for (const value of ["25%", "184", "Material de consumo"]) {
    const html = renderToStaticMarkup(createElement(PublicKpi, { icon: null, label: "Indicador", value, detail: "Recorte" }));
    assert.ok(html.includes(`<strong>${value}</strong>`));
    assert.ok(!html.includes("title="));
  }
});
