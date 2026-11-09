import type { ApiCompany } from "@/features/dashboard/gestor/gestor-api";
import { loadCompanyDirectory } from "@/features/dashboard/gestor/gestor-api";
import { listPaymentSuppliersService } from "./payments.service";
import type { PaymentSupplier } from "./payments.types";

export interface LocalPaymentSummary {
  mePayments: number;
  localAmount: string;
  externalAmount: string;
  unknownAmount: string;
  percentage: number | null;
  localSuppliers: number;
  knownSuppliers: number;
  unknownSuppliers: number;
}
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
function cents(value: string): bigint {
  if (!/^-?\d+(\.\d+)?$/.test(value)) throw new Error("Valor monetário inválido");
  const negative = value.startsWith("-");
  const [integer, fraction = ""] = value.replace(/^-/, "").split(".");
  if (fraction.slice(2).replaceAll("0", "")) throw new Error("Valor com fração de centavo");
  const amount = BigInt(integer) * BigInt(100) + BigInt(fraction.padEnd(2, "0").slice(0, 2));
  return negative ? -amount : amount;
}
function decimal(value: bigint) {
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  return `${negative ? "-" : ""}${absolute / BigInt(100)}.${String(absolute % BigInt(100)).padStart(2, "0")}`;
}
export function calculateLocalPayments(rows: PaymentSupplier[], companies: Map<string, Pick<ApiCompany, "municipio_empresa" | "uf_empresa">>, municipalityName: string, municipalityUf: string, totalAmount: string, meAmount: string): LocalPaymentSummary {
  let local = BigInt(0), external = BigInt(0), unknown = BigInt(0), meTotal = BigInt(0);
  let mePayments = 0;
  const localCompanies = new Set<string>(), knownCompanies = new Set<string>(), unknownCompanies = new Set<string>();
  for (const row of rows) {
    if (row.categoria_porte !== "ME") throw new Error("Recorte de porte divergente");
    const value = cents(row.valor_pago);
    meTotal += value;
    mePayments += row.quantidade_pagamentos;
    const document = row.documento.replace(/\D/g, "");
    const company = document.length === 14 && row.tipo_documento === "CNPJ" ? companies.get(document) : undefined;
    if (!company?.municipio_empresa?.trim() || !company.uf_empresa?.trim()) {
      unknown += value;
      unknownCompanies.add(document || row.documento);
      continue;
    }
    knownCompanies.add(document);
    if (normalize(company.municipio_empresa) === normalize(municipalityName) && normalize(company.uf_empresa) === normalize(municipalityUf)) {
      local += value;
      localCompanies.add(document);
    } else external += value;
  }
  // Não publicar um recorte parcial devido a página ausente, duplicada ou filtro divergente.
  if (meTotal !== cents(meAmount)) throw new Error("Fornecedores ME não reconciliam com o resumo da coleta");
  const total = cents(totalAmount);
  const canCalculate = total > BigInt(0) && (knownCompanies.size > 0 || meTotal === BigInt(0));
  return { mePayments, localAmount: decimal(local), externalAmount: decimal(external), unknownAmount: decimal(unknown), percentage: canCalculate ? Number(local) / Number(total) * 100 : null, localSuppliers: localCompanies.size, knownSuppliers: knownCompanies.size, unknownSuppliers: unknownCompanies.size };
}
export async function loadLocalPayments(query: { codigo_municipio: string; ano: number; coleta_id: number; codigo_natureza?: string }, municipalityName: string, totalAmount: string, meAmount: string): Promise<LocalPaymentSummary> {
  if (cents(meAmount) === BigInt(0)) return calculateLocalPayments([], new Map(), municipalityName, "CE", totalAmount, meAmount);
  const [rows, companies] = await Promise.all([
    (async () => {
      const rows: PaymentSupplier[] = [];
      for (let offset = 0; ; offset += 100) {
        const page = await listPaymentSuppliersService({ ...query, categoria_porte: "ME", limit: 100, offset });
        if (page.coleta_id !== query.coleta_id || page.offset !== offset) throw new Error("Coleta ou página divergente");
        rows.push(...page.data);
        if (page.data.length < 100) return rows;
      }
    })(),
    loadCompanyDirectory(),
  ]);
  const locations = new Map([...companies].map(([document, company]) => [document.replace(/\D/g, ""), company]));
  return calculateLocalPayments(rows, locations, municipalityName, "CE", totalAmount, meAmount);
}
