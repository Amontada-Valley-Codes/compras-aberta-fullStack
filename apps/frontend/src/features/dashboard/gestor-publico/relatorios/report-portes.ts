// Sem "use client": cálculos por porte de empresa usados pelos relatórios do
// gestor. Funções puras (sem rede), para poderem ser testadas isoladamente.
//
// A API de pagamentos classifica cada favorecido em uma categoria de porte:
// ME (porte 01), EPP (porte 03), DEMAIS (porte 05) e categorias sem porte
// (CPF, documento inválido, porte não informado, sem classificação, MEI fora
// da regra). As três primeiras são comparadas lado a lado; as demais ficam
// juntas em "Sem classificação de porte", para os totais fecharem com o total
// pago sem inflar "Demais empresas".

import type { PaymentNature, PaymentSupplier } from "@/services/analytics/payments.types";
import type { ReportTone } from "./report-document";

export const PORTES = ["ME", "EPP", "DEMAIS", "OUTROS"] as const;
export type Porte = (typeof PORTES)[number];

export const PORTE_LABEL: Record<Porte, string> = {
  ME: "Microempresas (ME)",
  EPP: "Empresas de pequeno porte (EPP)",
  DEMAIS: "Demais empresas",
  OUTROS: "Sem classificação de porte",
};

export const PORTE_SHORT: Record<Porte, string> = {
  ME: "ME",
  EPP: "EPP",
  DEMAIS: "Demais",
  OUTROS: "Sem classificação",
};

// Cabeçalho de coluna estreita (percentual, contagem).
export const PORTE_HEADER: Record<Porte, string> = { ...PORTE_SHORT, OUTROS: "Sem classif." };

export const PORTE_TONE: Record<Porte, ReportTone> = {
  ME: "primary",
  EPP: "gold",
  DEMAIS: "slate",
  OUTROS: "light",
};

// Nomes das categorias sem porte, para explicar o que entra em "Sem
// classificação de porte".
export const UNCLASSIFIED_LABEL: Record<string, string> = {
  PORTE_NAO_INFORMADO: "porte não informado no cadastro",
  SEM_CLASSIFICACAO: "fornecedor ainda sem classificação",
  ME_EXCLUIDA_REGRA_MEI: "MEI fora do subtotal de ME pela regra da coleta",
  FAVORECIDO_CPF: "favorecido pessoa física (CPF)",
  DOCUMENTO_INVALIDO_OU_AUSENTE: "documento inválido ou ausente",
};

export function porteOf(category: string | null | undefined): Porte {
  const value = (category ?? "").trim().toUpperCase();
  return value === "ME" || value === "EPP" || value === "DEMAIS" ? value : "OUTROS";
}

// ---------- Valores em centavos ----------
// A API manda valores como texto decimal ("22035853.2600"). Somar em
// centavos inteiros evita erro de arredondamento nos totais.
export class InvalidAmountError extends Error {}

export function toCents(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) throw new InvalidAmountError(`Valor monetário inválido: ${String(value)}`);
  return Math.round(number * 100);
}

export type PorteTotals = Record<Porte, number> & { total: number };

export const emptyTotals = (): PorteTotals => ({ ME: 0, EPP: 0, DEMAIS: 0, OUTROS: 0, total: 0 });

export function addCents(target: PorteTotals, porte: Porte, cents: number): void {
  target[porte] += cents;
  target.total += cents;
}

export function mergeTotals(target: PorteTotals, source: PorteTotals): PorteTotals {
  for (const porte of PORTES) target[porte] += source[porte];
  target.total += source.total;
  return target;
}

// Linha do resumo de pagamentos (uma natureza) separada por porte. O total de
// controle manda: o que não é ME, EPP nem DEMAIS vira "sem classificação".
export function natureTotals(row: PaymentNature): PorteTotals {
  const categories = row.valores_por_categoria ?? {};
  const me = toCents(categories.ME ?? row.valor_me);
  const epp = toCents(categories.EPP);
  const demais = toCents(categories.DEMAIS);
  const total = Math.max(toCents(row.total_controle), me + epp + demais);
  return { ME: me, EPP: epp, DEMAIS: demais, OUTROS: total - me - epp - demais, total };
}

export function summaryTotals(rows: PaymentNature[]): PorteTotals {
  return rows.reduce((totals, row) => mergeTotals(totals, natureTotals(row)), emptyTotals());
}

// Categorias sem porte presentes no recorte, do maior para o menor valor.
export function unclassifiedBreakdown(rows: PaymentNature[]): Array<{ category: string; label: string; cents: number }> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    for (const [category, value] of Object.entries(row.valores_por_categoria ?? {})) {
      if (porteOf(category) !== "OUTROS") continue;
      const cents = toCents(value);
      if (cents > 0) totals.set(category, (totals.get(category) ?? 0) + cents);
    }
  }
  return [...totals]
    .map(([category, cents]) => ({ category, label: UNCLASSIFIED_LABEL[category] ?? category.toLocaleLowerCase("pt-BR").replace(/_/g, " "), cents }))
    .sort((a, b) => b.cents - a.cents);
}

// ---------- Fornecedores ----------
export interface SupplierAggregate {
  // CNPJ só com dígitos ou, para outros documentos, tipo + documento.
  key: string;
  cnpj: string | null;
  name: string;
  porte: Porte;
  payments: number;
  cents: number;
  natures: Set<string>;
}

export function cnpjOf(row: Pick<PaymentSupplier, "documento" | "tipo_documento">): string | null {
  if ((row.tipo_documento ?? "").toUpperCase() !== "CNPJ") return null;
  const digits = row.documento.replace(/\D/g, "");
  return digits.length === 14 ? digits : null;
}

// Uma linha por fornecedor (a API traz uma por fornecedor e natureza), do
// maior para o menor valor pago. O porte é o da natureza com mais valor, caso
// a fonte divirja entre linhas do mesmo documento.
export function groupSuppliers(rows: PaymentSupplier[]): SupplierAggregate[] {
  const groups = new Map<string, SupplierAggregate & { porteCents: Map<Porte, number> }>();
  for (const row of rows) {
    const cnpj = cnpjOf(row);
    const key = cnpj ?? `${row.tipo_documento ?? "DOC"}:${row.documento}`;
    const cents = toCents(row.valor_pago);
    const porte = porteOf(row.categoria_porte);
    const group = groups.get(key) ?? {
      key,
      cnpj,
      name: row.nome_negociante?.trim() || "Fornecedor não informado",
      porte,
      payments: 0,
      cents: 0,
      natures: new Set<string>(),
      porteCents: new Map<Porte, number>(),
    };
    group.payments += row.quantidade_pagamentos || 0;
    group.cents += cents;
    group.natures.add(row.codigo_natureza);
    group.porteCents.set(porte, (group.porteCents.get(porte) ?? 0) + cents);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map(({ porteCents, ...group }) => ({
      ...group,
      porte: [...porteCents].sort((a, b) => b[1] - a[1])[0]?.[0] ?? group.porte,
    }))
    .sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name, "pt-BR"));
}

export interface PorteStats {
  suppliers: number;
  payments: number;
  cents: number;
}

export function statsByPorte(suppliers: SupplierAggregate[]): Record<Porte, PorteStats> {
  const stats = Object.fromEntries(PORTES.map((porte) => [porte, { suppliers: 0, payments: 0, cents: 0 }])) as Record<Porte, PorteStats>;
  for (const supplier of suppliers) {
    const entry = stats[supplier.porte];
    entry.suppliers += 1;
    entry.payments += supplier.payments;
    entry.cents += supplier.cents;
  }
  return stats;
}

// Pagamentos por porte numa lista de linhas (uma natureza, um estado…).
export function totalsOf(rows: PaymentSupplier[]): PorteTotals {
  const totals = emptyTotals();
  for (const row of rows) addCents(totals, porteOf(row.categoria_porte), toCents(row.valor_pago));
  return totals;
}

// Participação (0–100) ou null quando não há base.
export function share(part: number, total: number): number | null {
  return total > 0 ? (part / total) * 100 : null;
}
