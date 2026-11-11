import type { MunicipalityDetailData } from "./municipality-detail-data";
import { titleCase } from "@/features/public-data/plain-language";

export function buildDetailNatureRows(data: MunicipalityDetailData) {
  return (data.analysis.payments.data?.data ?? []).map((item) => ({ code: item.codigo_natureza, label: item.nome_natureza, value: Number(item.total_controle) })).sort((a, b) => b.value - a.value);
}
export function buildDetailHistory(data: MunicipalityDetailData, code: string) {
  return [...data.history].sort((a, b) => a.year - b.year).map((item) => {
    const row = item.payments.data?.data.find((row) => row.codigo_natureza === code);
    return { year: item.year, value: row ? Number(row.total_controle) : null };
  });
}
export function buildDetailSuppliers(data: MunicipalityDetailData) {
  const groups = new Map<string, { id: string; name: string; document: string; size: string; total: number; payments: number; identified: boolean }>();
  for (const row of data.suppliers.data ?? []) {
    const id = `${row.tipo_documento ?? ""}:${row.documento}`;
    const supplier = groups.get(id) ?? { id, document: row.documento, name: titleCase(row.nome_negociante ?? "Fornecedor não identificado"), size: row.categoria_porte, total: 0, payments: 0, identified: (row.tipo_documento === "CNPJ" && /^\d{14}$/.test(row.documento)) || (row.tipo_documento === "CPF" && /^\d{11}$/.test(row.documento)) };
    supplier.total += Number(row.valor_pago);
    supplier.payments += row.quantidade_pagamentos;
    groups.set(id, supplier);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total);
}
