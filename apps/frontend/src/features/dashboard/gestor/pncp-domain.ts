import { titleCase } from "@/features/public-data/plain-language";
import type { PncpContract, PncpPlanItem, PncpProcurement } from "./pncp-api";

// Sem "use client" e sem rede: cálculos sobre os dados do PNCP, usados nas
// páginas (servidor) e nas tabelas interativas (cliente).

// "SECRETARIA DE EDUCAÇÃO" → "Secretaria de Educação"
export const unitLabel = (value: string) => titleCase(value.replace(/\s+/g, " "));

export const DAY_MS = 24 * 60 * 60 * 1000;

// Dias (arredondados para cima) até a data; null sem data.
export function daysUntil(value: string | null, now = Date.now()): number | null {
  return value ? Math.ceil((new Date(value).getTime() - now) / DAY_MS) : null;
}

// ---------- Economia (estimado x resultado) ----------
// Metodologia: o resultado de cada processo é o valor homologado publicado no
// PNCP; quando a prefeitura não publica o homologado, usa-se a soma dos
// contratos vinculados à compra (cada contrato aponta para a compra que o
// originou). Ficam de fora: registros de preços (SRP), que contratam aos
// poucos ao longo da validade da ata, e processos cujo contratado fica abaixo
// de 30% ou acima de 150% do estimado (contratação parcial ou vínculo
// inconsistente). Economia = estimado − resultado; o percentual é sobre o
// estimado dos processos considerados.

export const MIN_RESULT_RATIO = 0.3;
export const MAX_RESULT_RATIO = 1.5;

// Valor contratado por compra (número de controle PNCP da compra).
export function contractedByProcurement(contracts: PncpContract[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const contract of contracts) {
    if (!contract.procurementControlNumber) continue;
    map.set(contract.procurementControlNumber, (map.get(contract.procurementControlNumber) ?? 0) + contract.globalValue);
  }
  return map;
}

type ResultBasis = "homologated" | "contracted";

// Registro de preços: nem toda prefeitura marca o campo "srp" no PNCP, então
// também vale o que está escrito no objeto ou no número da compra.
export function isPriceRegistration(row: PncpProcurement): boolean {
  return row.srp
    || /registro\s+de\s+pre[çc]os?/i.test(row.object)
    || /\bSRP\b/i.test(`${row.purchaseNumber} ${row.process ?? ""}`);
}

// Aditivos e apostilamentos às vezes são publicados com valor simbólico (R$ 1).
export const contractValueLabel = (value: number, format: (value: number) => string) =>
  value > 1 ? format(value) : "Valor simbólico";

function resultOf(row: PncpProcurement, contracted?: Map<string, number>): { value: number; basis: ResultBasis } | null {
  if ((row.awarded ?? 0) > 0) return { value: row.awarded!, basis: "homologated" };
  const value = isPriceRegistration(row) ? 0 : contracted?.get(row.controlNumber) ?? 0;
  return value > 0 ? { value, basis: "contracted" } : null;
}

export interface SavingsGroup {
  label: string;
  processes: number;
  estimated: number;
  awarded: number;
  savings: number;
  percent: number;
}

export interface SavingsSummary extends SavingsGroup {
  eligible: number;
  published: number;
  aboveEstimate: number;
  byHomologated: number;
  byContract: number;
  excluded: number;
  byModality: SavingsGroup[];
  byUnit: SavingsGroup[];
  top: Array<PncpProcurement & { savings: number; percent: number }>;
}

function group(rows: PncpProcurement[], key: (row: PncpProcurement) => string): SavingsGroup[] {
  const map = new Map<string, SavingsGroup>();
  for (const row of rows) {
    const label = key(row);
    const entry = map.get(label) ?? { label, processes: 0, estimated: 0, awarded: 0, savings: 0, percent: 0 };
    entry.processes += 1;
    entry.estimated += row.estimated ?? 0;
    entry.awarded += row.awarded ?? 0;
    map.set(label, entry);
  }
  return [...map.values()]
    .map((entry) => ({
      ...entry,
      savings: entry.estimated - entry.awarded,
      percent: entry.estimated > 0 ? ((entry.estimated - entry.awarded) / entry.estimated) * 100 : 0,
    }))
    .sort((a, b) => b.savings - a.savings);
}

export function summarizeSavings(rows: PncpProcurement[], contracted?: Map<string, number>): SavingsSummary {
  let excluded = 0;
  const bases = new Map<string, ResultBasis>();
  const eligible: PncpProcurement[] = [];
  for (const row of rows) {
    const estimated = row.estimated ?? 0;
    const result = estimated > 0 ? resultOf(row, contracted) : null;
    if (!result) continue;
    const ratio = result.value / estimated;
    if (result.basis === "contracted" && (ratio < MIN_RESULT_RATIO || ratio > MAX_RESULT_RATIO)) {
      excluded += 1;
      continue;
    }
    bases.set(row.controlNumber, result.basis);
    // A partir daqui "awarded" é o resultado considerado (homologado ou contratado).
    eligible.push({ ...row, awarded: result.value });
  }
  const [total] = group(eligible, () => "total");
  const base = total ?? { label: "total", processes: 0, estimated: 0, awarded: 0, savings: 0, percent: 0 };
  return {
    ...base,
    eligible: eligible.length,
    published: rows.length,
    byHomologated: [...bases.values()].filter((basis) => basis === "homologated").length,
    byContract: [...bases.values()].filter((basis) => basis === "contracted").length,
    excluded,
    aboveEstimate: eligible.filter((row) => (row.awarded ?? 0) > (row.estimated ?? 0)).length,
    byModality: group(eligible, (row) => row.modality),
    byUnit: group(eligible, (row) => unitLabel(row.unitName)),
    top: eligible
      .map((row) => ({ ...row, savings: (row.estimated ?? 0) - (row.awarded ?? 0), percent: (((row.estimated ?? 0) - (row.awarded ?? 0)) / (row.estimated ?? 1)) * 100 }))
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 10),
  };
}

// ---------- Gastos por secretaria e modalidade ----------

export interface SpendingGroup {
  label: string;
  processes: number;
  estimated: number;
  awarded: number;
}

export function spendingBy(rows: PncpProcurement[], key: (row: PncpProcurement) => string): SpendingGroup[] {
  const map = new Map<string, SpendingGroup>();
  for (const row of rows) {
    const label = key(row);
    const entry = map.get(label) ?? { label, processes: 0, estimated: 0, awarded: 0 };
    entry.processes += 1;
    entry.estimated += row.estimated ?? 0;
    entry.awarded += row.awarded ?? 0;
    map.set(label, entry);
  }
  return [...map.values()].sort((a, b) => b.estimated - a.estimated);
}

// ---------- Contratos ----------

export type ContractStatus = "ending30" | "ending90" | "active" | "ended" | "upcoming" | "unknown";

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  ending30: "Vence em até 30 dias",
  ending90: "Vence em até 90 dias",
  active: "Vigente",
  ended: "Encerrado",
  upcoming: "Ainda não iniciado",
  unknown: "Vigência não informada",
};

export interface ContractRow extends PncpContract {
  status: ContractStatus;
  daysLeft: number | null;
  progress: number | null;
}

const dayStart = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00Z`).getTime();

export function classifyContracts(rows: PncpContract[], now = Date.now()): ContractRow[] {
  const today = dayStart(new Date(now).toISOString());
  return rows
    .map((row) => {
      if (!row.endsAt) return { ...row, status: "unknown" as const, daysLeft: null, progress: null };
      const end = dayStart(row.endsAt);
      const start = row.startsAt ? dayStart(row.startsAt) : null;
      const daysLeft = Math.round((end - today) / DAY_MS);
      const progress = start !== null && end > start ? Math.min(100, Math.max(0, ((today - start) / (end - start)) * 100)) : null;
      let status: ContractStatus = "active";
      if (start !== null && start > today) status = "upcoming";
      else if (daysLeft < 0) status = "ended";
      else if (daysLeft <= 30) status = "ending30";
      else if (daysLeft <= 90) status = "ending90";
      return { ...row, status, daysLeft, progress };
    })
    .sort((a, b) => {
      const order: ContractStatus[] = ["ending30", "ending90", "active", "upcoming", "unknown", "ended"];
      return order.indexOf(a.status) - order.indexOf(b.status) || (a.daysLeft ?? 99_999) - (b.daysLeft ?? 99_999);
    });
}

export const isCurrent = (row: ContractRow) => row.status === "active" || row.status === "ending30" || row.status === "ending90";

// ---------- PCA ----------

export interface PlanGroup {
  label: string;
  items: number;
  total: number;
}

export function planBy(items: PncpPlanItem[], key: (item: PncpPlanItem) => string): PlanGroup[] {
  const map = new Map<string, PlanGroup>();
  for (const item of items) {
    const label = key(item);
    const entry = map.get(label) ?? { label, items: 0, total: 0 };
    entry.items += 1;
    entry.total += item.total;
    map.set(label, entry);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

// Planejado no PCA x publicado no PNCP (valor estimado), por órgão.
export interface PlanExecution {
  label: string;
  planned: number;
  published: number;
  percent: number | null;
}

export function planExecution(items: PncpPlanItem[], procurements: PncpProcurement[]): PlanExecution[] {
  const byAgency = new Map<string, PlanExecution>();
  for (const item of items) {
    const entry = byAgency.get(item.agencyCnpj) ?? { label: unitLabel(item.unitName), planned: 0, published: 0, percent: null };
    entry.planned += item.total;
    byAgency.set(item.agencyCnpj, entry);
  }
  for (const row of procurements) {
    const entry = byAgency.get(row.agencyCnpj);
    if (entry) entry.published += row.estimated ?? 0;
  }
  return [...byAgency.values()]
    .map((entry) => ({ ...entry, percent: entry.planned > 0 ? (entry.published / entry.planned) * 100 : null }))
    .sort((a, b) => b.planned - a.planned);
}

// ---------- Fluxo das licitações ----------
// Em que situação está o dinheiro de cada secretaria (ou modalidade):
// contratado, homologado ou ainda sem resultado publicado. O valor de cada
// contratação é o estimado no edital (ou o homologado, sem estimado).

export type FlowStatus = "contracted" | "awarded" | "pending";

export const FLOW_STATUS_LABEL: Record<FlowStatus, string> = {
  contracted: "Contratado",
  awarded: "Homologado",
  pending: "Sem resultado publicado",
};

export interface FlowGroup {
  label: string;
  count: number;
  total: number;
  parts: Record<FlowStatus, number>;
}

export interface FlowBreakdown {
  totals: Record<FlowStatus, number>;
  total: number;
  byUnit: FlowGroup[];
  byModality: FlowGroup[];
}

export function buildFlowBreakdown(rows: PncpProcurement[], contracted?: Map<string, number>): FlowBreakdown {
  const empty = (): Record<FlowStatus, number> => ({ contracted: 0, awarded: 0, pending: 0 });
  const totals = empty();
  const units = new Map<string, FlowGroup>();
  const modalities = new Map<string, FlowGroup>();
  const add = (map: Map<string, FlowGroup>, label: string, status: FlowStatus, value: number) => {
    const group = map.get(label) ?? { label, count: 0, total: 0, parts: empty() };
    group.count += 1;
    group.total += value;
    group.parts[status] += value;
    map.set(label, group);
  };
  for (const row of rows) {
    const value = row.estimated || row.awarded || 0;
    if (value <= 0) continue;
    const status: FlowStatus = contracted?.has(row.controlNumber) ? "contracted" : (row.awarded ?? 0) > 0 ? "awarded" : "pending";
    totals[status] += value;
    add(units, unitLabel(row.unitName), status, value);
    add(modalities, row.modality, status, value);
  }
  const sorted = (map: Map<string, FlowGroup>) => [...map.values()].sort((a, b) => b.total - a.total);
  return {
    totals,
    total: totals.contracted + totals.awarded + totals.pending,
    byUnit: sorted(units),
    byModality: sorted(modalities),
  };
}
