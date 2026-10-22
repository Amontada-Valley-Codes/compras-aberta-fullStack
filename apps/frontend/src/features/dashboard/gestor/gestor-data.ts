import type { DataResult } from "@/features/public-data/public-data";
import { listDetailedBidsService } from "@/services/analytics/list-detailed-bids.service";
import { listExpensesByNatureService } from "@/services/analytics/list-expenses-by-nature.service";
import type { DetailedBid, ExpensesByNatureResponse } from "@/services/analytics/analytics.types";
import type { MunicipalityOption } from "@/services/municipalities/municipalities.types";
import { loadCompanyDirectory, loadParticipations } from "./gestor-api";
import { buildSuppliers, participationsOfYear, topShare, type SupplierRow } from "./gestor-domain";

// Sem "use client": monta a visão geral do painel no servidor.
//
// Valores e fornecedores vêm das participações (empresas vencedoras) e a
// cidade de cada fornecedor do cadastro de empresas da API — assim "ficou no
// município" considera todas as empresas sediadas na cidade, de qualquer
// porte. Gastos por tipo de compra e a categoria de cada fornecedor dependem
// das dotações, que a API às vezes ainda não publicou.

export const GESTOR_TOP_SUPPLIERS = 10;

const LOAD_ERROR = "Não foi possível carregar estes dados. Tente novamente mais tarde.";
const ORIGIN_ERROR = "Não foi possível identificar a cidade dos fornecedores agora. Tente novamente em instantes.";

export interface GestorRetention {
  total: number;
  local: number;
  localMicro: number;
  external: number;
  unknown: number;
  localPercent: number;
  externalPercent: number;
}

export interface GestorOverview {
  municipalityName: string;
  year: number;
  // Total e contagens dependem só das participações; a divisão local x fora
  // depende também do cadastro de empresas.
  totals: DataResult<{ total: number; bids: number; suppliers: number; micro: number }>;
  retention: DataResult<GestorRetention & { localSuppliers: number; localMicroSuppliers: number }>;
  monthly: DataResult<number[]>;
  expenses: DataResult<ExpensesByNatureResponse["data"]>;
  suppliers: DataResult<{ rows: SupplierRow[]; total: number; top5Share: number; hasCategories: boolean }>;
}

async function result<T>(promise: Promise<T>, error = LOAD_ERROR): Promise<DataResult<T>> {
  try {
    return { data: await promise, error: null };
  } catch {
    return { data: null, error };
  }
}

// Categoria principal de cada fornecedor, quando a API tem as dotações
// (licitações detalhadas). A rota repete a mesma licitação + empresa uma vez
// por tipo de compra, com o mesmo valor: cada par conta uma vez por tipo.
async function loadNatureMap(tceCode: string, year: number): Promise<Map<string, { code: string; name: string }>> {
  const rows: DetailedBid[] = [];
  for (let offset = 0; offset < 3000; offset += 100) {
    const page = await listDetailedBidsService({ codigo_municipio: tceCode, ano: year, limit: 100, offset });
    rows.push(...page.data);
    if (page.data.length < 100) break;
  }
  const byCnpj = new Map<string, Map<string, { name: string; value: number }>>();
  for (const row of rows) {
    if (!row.cnpj) continue;
    const natures = byCnpj.get(row.cnpj) ?? new Map();
    const nature = natures.get(row.codigo_natureza) ?? { name: row.nome_natureza, value: 0 };
    nature.value += Number(row.valor_total_vencido) || 0;
    natures.set(row.codigo_natureza, nature);
    byCnpj.set(row.cnpj, natures);
  }
  return new Map([...byCnpj.entries()].map(([cnpj, natures]) => {
    const [code, nature] = [...natures.entries()].sort((a, b) => b[1].value - a[1].value)[0];
    return [cnpj, { code, name: nature.name }];
  }));
}

export async function loadGestorOverview(municipality: MunicipalityOption, year: number): Promise<GestorOverview> {
  const period = { codigo_municipio: municipality.tceCode, data_inicio: `${year}-01-01`, data_fim: `${year}-12-31` };

  const [participations, directory, expenses, natures] = await Promise.all([
    result(loadParticipations(municipality.tceCode)),
    result(loadCompanyDirectory(), ORIGIN_ERROR),
    result(listExpensesByNatureService(period)),
    loadNatureMap(municipality.tceCode, year).catch(() => new Map<string, { code: string; name: string }>()),
  ]);

  const base = { municipalityName: municipality.name, year, expenses: expenses.data ? { data: expenses.data.data, error: null } : { data: null, error: expenses.error } };

  if (!participations.data) {
    const failed = { data: null, error: participations.error };
    return { ...base, totals: failed, retention: failed, monthly: failed, suppliers: failed };
  }

  const rows = participationsOfYear(participations.data, year);
  const suppliers = buildSuppliers(rows, directory.data, municipality.name, natures);
  const total = suppliers.reduce((sum, supplier) => sum + supplier.total, 0);
  const sumWhere = (filter: (supplier: SupplierRow) => boolean) =>
    suppliers.filter(filter).reduce((sum, supplier) => sum + supplier.total, 0);
  const percentOf = (value: number) => (total > 0 ? (value / total) * 100 : 0);

  const monthly = Array.from({ length: 12 }, () => 0);
  for (const row of rows) {
    const month = Number(row.data_realizacao_licitacao?.slice(5, 7));
    if (month >= 1 && month <= 12) monthly[month - 1] += Number(row.valor_total_vencido) || 0;
  }

  let retention: GestorOverview["retention"] = { data: null, error: directory.error };
  if (directory.data) {
    const local = sumWhere((supplier) => supplier.origin === "local");
    const external = sumWhere((supplier) => supplier.origin === "external");
    retention = {
      data: {
        total,
        local,
        localMicro: sumWhere((supplier) => supplier.origin === "local" && supplier.isMicro),
        external,
        unknown: sumWhere((supplier) => supplier.origin === "unknown"),
        localPercent: percentOf(local),
        externalPercent: percentOf(external),
        localSuppliers: suppliers.filter((supplier) => supplier.origin === "local").length,
        localMicroSuppliers: suppliers.filter((supplier) => supplier.origin === "local" && supplier.isMicro).length,
      },
      error: null,
    };
  }

  return {
    ...base,
    totals: {
      data: {
        total,
        bids: new Set(rows.map((row) => row.numero_licitacao)).size,
        suppliers: suppliers.length,
        micro: suppliers.filter((supplier) => supplier.isMicro).length,
      },
      error: null,
    },
    retention,
    monthly: { data: monthly, error: null },
    suppliers: {
      data: {
        rows: suppliers.slice(0, GESTOR_TOP_SUPPLIERS),
        total: suppliers.length,
        top5Share: topShare(suppliers, 5),
        hasCategories: suppliers.some((supplier) => supplier.natureCode),
      },
      error: null,
    },
  };
}
