"use client";

import { PublicTable } from "@/components/filters/PublicTable";
import { useMemo, useState } from "react";
import { ArrowDownAZ } from "lucide-react";
import type { DetailedBid } from "@/services/analytics/analytics.types";
import { formatCnpj, money } from "@/features/public-data/format";
import { natureLabel, officialNatureName, titleCase } from "@/features/public-data/plain-language";

export function AnalysisBidsTable({ rows }: { rows: DetailedBid[] }) {
  type SortKey = "numero" | "empresa" | "cnpj" | "municipio" | "natureza" | "ano" | "valor";
  const [sortKey, setSortKey] = useState<SortKey>("empresa");
  const [ascending, setAscending] = useState(true);
  const sort = (key: SortKey) => {
    if (key === sortKey) setAscending((value) => !value);
    else { setSortKey(key); setAscending(true); }
  };
  const valueFor = (row: DetailedBid, key: SortKey): string | number => {
    if (key === "numero") return row.numero_licitacao;
    if (key === "empresa") return row.empresa ?? "";
    if (key === "cnpj") return row.cnpj ?? "";
    if (key === "municipio") return row.municipio;
    if (key === "natureza") return natureLabel(row.codigo_natureza, row.nome_natureza);
    if (key === "ano") return row.ano_licitacao;
    return Number(row.valor_total_vencido) || 0;
  };
  const sortedRows = useMemo(() => [...rows].sort((a, b) => {
    const left = valueFor(a, sortKey);
    const right = valueFor(b, sortKey);
    const result = typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left).localeCompare(String(right), "pt-BR", { numeric: true, sensitivity: "base" });
    return ascending ? result : -result;
  }), [ascending, rows, sortKey]);
  const header = (label: string, key: SortKey) => <button className="analysis-sort-button" type="button" onClick={() => sort(key)} aria-label={`Ordenar ${label}`}><span>{label}</span><ArrowDownAZ size={16} aria-hidden="true" /></button>;

  return <div className="analysis-table-scroll"><PublicTable>
    <thead><tr>
      <th>{header("Nº da licitação", "numero")}</th><th>{header("Empresa vencedora", "empresa")}</th><th>{header("CNPJ", "cnpj")}</th><th>{header("Município", "municipio")}</th><th>{header("Tipo de compra", "natureza")}</th><th>{header("Ano", "ano")}</th><th>{header("Valor de compra", "valor")}</th>
    </tr></thead>
    <tbody>{sortedRows.map((bid, index) => <tr key={`${bid.codigo_municipio}-${bid.numero_licitacao}-${bid.cnpj}-${index}`}>
      <td><b>{bid.numero_licitacao}</b></td><td><span className="analysis-table-ellipsis" title={bid.empresa ?? "Não informada"}>{bid.empresa ?? "Não informada"}</span></td><td>{formatCnpj(bid.cnpj)}</td><td>{titleCase(bid.municipio)}</td><td><span className="analysis-table-ellipsis" title={officialNatureName(bid.nome_natureza)}>{natureLabel(bid.codigo_natureza, bid.nome_natureza)}</span></td><td>{bid.ano_licitacao}</td><td><strong>{money(bid.valor_total_vencido)}</strong></td>
    </tr>)}</tbody>
  </PublicTable></div>;
}
