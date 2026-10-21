import { titleCase } from "@/features/public-data/plain-language";
import type { ApiBid, ApiCompany, ApiParticipation } from "./gestor-api";

// Sem "use client" e sem acesso à rede: regras de cálculo puras, usadas
// tanto nas páginas (servidor) quanto nas tabelas interativas (cliente).

export type SupplierOrigin = "local" | "external" | "unknown";

export interface SupplierRow {
  // Posição no ranking por valor (1 = quem mais recebeu).
  rank: number;
  cnpj: string;
  name: string;
  size: string | null;
  isMicro: boolean;
  city: string | null;
  origin: SupplierOrigin;
  total: number;
  bids: number;
  share: number;
  natureCode: string | null;
  natureName: string | null;
}

export interface BidWinner {
  cnpj: string;
  name: string;
  value: number;
  origin: SupplierOrigin;
}

export interface BidRow {
  number: string;
  date: string | null;
  value: number;
  items: number;
  companies: number;
  winners: BidWinner[];
  hasLocalWinner: boolean;
}

// "São Gonçalo do Amarante" (IBGE) e "SAO GONCALO DO AMARANTE" (Receita)
// precisam ser a mesma cidade.
export function normalizeCity(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toUpperCase();
}

export function isMicroenterprise(size: string | null | undefined): boolean {
  return /\bME\b|^Microempresa/i.test(size ?? "");
}

export function yearOf(date: string | null | undefined): number | null {
  const year = Number(date?.slice(0, 4));
  return Number.isInteger(year) && year > 1900 ? year : null;
}

// "2025-12-30" → "30/12/2025"
export function formatDateBr(value: string | null | undefined): string {
  const [year, month, day] = (value ?? "").slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
}

// "2026-11-14T23:59:00" → "14/11/2026 às 23:59"
export function formatDateTimeBr(value: string | null | undefined): string {
  if (!value) return "—";
  const time = value.slice(11, 16);
  return time && time !== "00:00" ? `${formatDateBr(value)} às ${time}` : formatDateBr(value);
}

// Mostra só o começo e os dígitos verificadores (ex.: 07.241.***/****-12).
export function maskCnpj(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length === 14 ? `${digits.slice(0, 2)}.${digits.slice(2, 5)}.***/****-${digits.slice(12)}` : "Não informado";
}

export function companyCity(company: ApiCompany | undefined): string | null {
  if (!company?.municipio_empresa) return null;
  return `${titleCase(company.municipio_empresa)}${company.uf_empresa ? `/${company.uf_empresa}` : ""}`;
}

export function originOf(company: ApiCompany | undefined, municipalityName: string): SupplierOrigin {
  if (!company?.municipio_empresa) return "unknown";
  return company.uf_empresa === "CE" && normalizeCity(company.municipio_empresa) === normalizeCity(municipalityName)
    ? "local"
    : "external";
}

export function participationsOfYear(rows: ApiParticipation[], year: number): ApiParticipation[] {
  return rows.filter((row) => yearOf(row.data_realizacao_licitacao) === year);
}

// Uma linha por empresa, somando o que ela venceu no período.
export function buildSuppliers(
  rows: ApiParticipation[],
  directory: Map<string, ApiCompany> | null,
  municipalityName: string,
  natures?: Map<string, { code: string; name: string }>,
): SupplierRow[] {
  const groups = new Map<string, { row: ApiParticipation; total: number; bids: Set<string> }>();
  for (const row of rows) {
    const group = groups.get(row.cnpj) ?? { row, total: 0, bids: new Set<string>() };
    group.total += Number(row.valor_total_vencido) || 0;
    group.bids.add(row.numero_licitacao);
    groups.set(row.cnpj, group);
  }
  const grandTotal = [...groups.values()].reduce((sum, group) => sum + group.total, 0);

  return [...groups.entries()]
    .map(([cnpj, group]) => {
      const company = directory?.get(cnpj);
      const nature = natures?.get(cnpj);
      return {
        rank: 0,
        cnpj,
        name: titleCase(group.row.razao_social ?? company?.razao_social ?? "Empresa não informada"),
        size: group.row.porte_empresa ?? company?.porte_empresa ?? null,
        isMicro: isMicroenterprise(group.row.porte_empresa ?? company?.porte_empresa),
        city: companyCity(company),
        origin: originOf(company, municipalityName),
        total: group.total,
        bids: group.bids.size,
        share: grandTotal > 0 ? (group.total / grandTotal) * 100 : 0,
        natureCode: nature?.code ?? null,
        natureName: nature?.name ?? null,
      };
    })
    .sort((a, b) => b.total - a.total)
    .map((supplier, index) => ({ ...supplier, rank: index + 1 }));
}

// Fatia do valor que ficou com os N maiores fornecedores.
export function topShare(suppliers: SupplierRow[], count: number): number {
  return suppliers.slice(0, count).reduce((sum, supplier) => sum + supplier.share, 0);
}

// Licitações do ano (rota /licitacoes) com as vencedoras (rota /participacoes).
export function buildBids(
  bids: ApiBid[],
  participations: ApiParticipation[],
  directory: Map<string, ApiCompany> | null,
  municipalityName: string,
): BidRow[] {
  const winners = new Map<string, BidWinner[]>();
  for (const row of participations) {
    const list = winners.get(row.numero_licitacao) ?? [];
    list.push({
      cnpj: row.cnpj,
      name: titleCase(row.razao_social ?? "Empresa não informada"),
      value: Number(row.valor_total_vencido) || 0,
      origin: originOf(directory?.get(row.cnpj), municipalityName),
    });
    winners.set(row.numero_licitacao, list);
  }

  return bids
    .map((bid) => {
      const list = (winners.get(bid.numero_licitacao) ?? []).sort((a, b) => b.value - a.value);
      return {
        number: bid.numero_licitacao,
        date: bid.data_realizacao_licitacao,
        value: Number(bid.valor_total_licitacao) || 0,
        items: bid.quantidade_itens,
        companies: bid.quantidade_empresas,
        winners: list,
        hasLocalWinner: list.some((winner) => winner.origin === "local"),
      };
    })
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || b.value - a.value);
}

export const ORIGIN_LABEL: Record<SupplierOrigin, string> = {
  local: "Fornecedor local",
  external: "Fornecedor de fora",
  unknown: "Origem não identificada",
};
