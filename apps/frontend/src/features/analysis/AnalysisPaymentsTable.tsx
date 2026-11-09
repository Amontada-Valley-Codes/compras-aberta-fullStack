"use client";

import { PublicTable } from "@/components/filters/PublicTable";
import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import type { PaymentSupplier } from "@/services/analytics/payments.types";
import { formatCnpj, money } from "@/features/public-data/format";
import { natureLabel } from "@/features/public-data/plain-language";

export function AnalysisPaymentsTable({ rows }: { rows: PaymentSupplier[] }) {
  type SortKey = "empresa" | "cnpj" | "natureza" | "pagamentos" | "valor";
  const [sortKey, setSortKey] = useState<SortKey>("empresa");
  const [ascending, setAscending] = useState(true);
  const sort = (key: SortKey) => {
    if (key === sortKey) setAscending((value) => !value);
    else { setSortKey(key); setAscending(true); }
  };
  const sortedRows = useMemo(() => [...rows].sort((a, b) => {
    const valueFor = (row: PaymentSupplier, key: SortKey): string | number => {
      if (key === "empresa") return row.nome_negociante ?? "";
      if (key === "cnpj") return row.documento;
      if (key === "natureza") return natureLabel(row.codigo_natureza, row.nome_natureza);
      if (key === "pagamentos") return row.quantidade_pagamentos;
      return Number(row.valor_pago);
    };
    const left = valueFor(a, sortKey);
    const right = valueFor(b, sortKey);
    const result = typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left).localeCompare(String(right), "pt-BR", { numeric: true, sensitivity: "base" });
    return ascending ? result : -result;
  }), [ascending, rows, sortKey]);
  const header = (label: string, key: SortKey) => <button className="analysis-sort-button" type="button" onClick={() => sort(key)} aria-label={`Ordenar ${label}${sortKey === key ? ascending ? ": crescente" : ": decrescente" : ""}`}><span>{label}</span>{sortKey === key && !ascending ? <ArrowDownAZ size={16} aria-hidden="true" /> : <ArrowUpAZ size={16} aria-hidden="true" />}</button>;

  return <div className="analysis-table-scroll"><PublicTable>
    <thead><tr>
      <th>{header("Fornecedor", "empresa")}</th><th>{header("Documento", "cnpj")}</th><th>{header("Natureza da despesa", "natureza")}</th><th>{header("Pagamentos", "pagamentos")}</th><th>{header("Valor de compra", "valor")}</th>
    </tr></thead>
    <tbody>{sortedRows.map((row, index) => <tr key={`${row.codigo_natureza}-${row.documento}-${index}`}>
      <td>{row.nome_negociante ?? "Não informado"}</td><td>{formatCnpj(row.documento)}</td><td>{natureLabel(row.codigo_natureza, row.nome_natureza)}</td><td>{row.quantidade_pagamentos}</td><td><strong>{money(row.valor_pago)}</strong></td>
    </tr>)}</tbody>
  </PublicTable></div>;
}
