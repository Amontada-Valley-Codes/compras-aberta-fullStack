import { getPaymentsSummaryService, listLocalPaymentsService } from "@/services/analytics/payments.service";
import type { PaymentNature, PaymentsSummaryResponse } from "@/services/analytics/payments.types";
import type { MunicipalityOption } from "@/services/municipalities/municipalities.types";

export type PaymentOverview = Pick<PaymentsSummaryResponse, "data" | "total_controle" | "total_me" | "percentual_me">;
export interface MunicipalityPaymentRow {
  municipality: MunicipalityOption;
  total: string;
  me: string;
  local: string | null;
}
export interface AllMunicipalityPayments {
  payments: PaymentsSummaryResponse;
  localAmount: string | null;
  localError: string | null;
  rows: MunicipalityPaymentRow[];
  requested: number;
  failed: number;
}

const cents = (value: string | undefined) => {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value ?? "0");
  if (!match) throw new Error("Valor monetário inválido na API de pagamentos.");
  return (match[1] ? -BigInt(1) : BigInt(1)) * (BigInt(match[2]) * BigInt(100) + BigInt((match[3] ?? "").padEnd(2, "0")));
};
const decimal = (value: bigint) => `${value < BigInt(0) ? "-" : ""}${(value < BigInt(0) ? -value : value) / BigInt(100)}.${((value < BigInt(0) ? -value : value) % BigInt(100)).toString().padStart(2, "0")}`;
const percent = (part: bigint, total: bigint) => total > BigInt(0) ? Number(part * BigInt(10000) / total) / 100 : null;
const cache = new Map<string, { expires: number; promise: Promise<AllMunicipalityPayments> }>();

export function loadAllMunicipalityPayments(municipalities: MunicipalityOption[], year: number, natureCode?: string): Promise<AllMunicipalityPayments> {
  const key = `${year}:${natureCode ?? ""}:${municipalities.map((item) => item.tceCode).join(",")}`;
  const existing = cache.get(key);
  if (existing && existing.expires > Date.now()) return existing.promise;
  const pending = (async () => {
    let next = 0;
    const results = new Array<{ municipality: MunicipalityOption; summary: PaymentsSummaryResponse; local: string | null } | null>(municipalities.length);
    await Promise.all(Array.from({ length: Math.min(12, municipalities.length) }, async () => {
      while (next < municipalities.length) {
        const index = next++;
        const municipality = municipalities[index];
        try {
          const code = municipality.tceCode.padStart(3, "0");
          const summary = await getPaymentsSummaryService({ codigo_municipio: code, ano: year });
          let local: string | null = null;
          try {
            const response = await listLocalPaymentsService({ codigo_municipio: code, ano: year, coleta_id: summary.coleta.coleta_id, codigo_natureza: natureCode, limit: 1, offset: 0 });
            if (response.coleta_id === summary.coleta.coleta_id && response.ano === year) local = response.resumo.valor_pago_me_local;
          } catch { /* O total geral continua disponível se o recorte local falhar. */ }
          results[index] = { municipality, summary, local };
        } catch { results[index] = null; }
      }
    }));

    const natures = new Map<string, { label: string; total: bigint; me: bigint; payments: number; categories: Map<string, bigint>; reconciled: boolean }>();
    const rows: MunicipalityPaymentRow[] = [];
    let total = BigInt(0);
    let me = BigInt(0);
    let localTotal = BigInt(0);
    let missingLocal = 0;
    for (const item of results) {
      if (!item) continue;
      const selected = item.summary.data.filter((row) => !natureCode || row.codigo_natureza === natureCode);
      const municipalityTotal = natureCode ? selected.reduce((sum, row) => sum + cents(row.total_controle), BigInt(0)) : cents(item.summary.total_controle);
      const municipalityMe = natureCode ? selected.reduce((sum, row) => sum + cents(row.valor_me), BigInt(0)) : cents(item.summary.total_me);
      total += municipalityTotal;
      me += municipalityMe;
      if (item.local === null) missingLocal += 1;
      else localTotal += cents(item.local);
      rows.push({ municipality: item.municipality, total: decimal(municipalityTotal), me: decimal(municipalityMe), local: item.local });
      for (const row of selected) {
        const current = natures.get(row.codigo_natureza) ?? { label: row.nome_natureza, total: BigInt(0), me: BigInt(0), payments: 0, categories: new Map<string, bigint>(), reconciled: true };
        current.total += cents(row.total_controle);
        current.me += cents(row.valor_me);
        current.payments += row.quantidade_pagamentos;
        current.reconciled &&= row.reconciliado;
        for (const [category, value] of Object.entries(row.valores_por_categoria)) current.categories.set(category, (current.categories.get(category) ?? BigInt(0)) + cents(value));
        natures.set(row.codigo_natureza, current);
      }
    }
    if (!rows.length) throw new Error("A API não retornou pagamentos dos municípios para este ano.");
    const natureRows: PaymentNature[] = [...natures].map(([codigo_natureza, value]) => ({
      codigo_natureza, nome_natureza: value.label, total_controle: decimal(value.total), valor_me: decimal(value.me),
      percentual_me: percent(value.me, value.total), quantidade_pagamentos: value.payments,
      valores_por_categoria: Object.fromEntries([...value.categories].map(([category, amount]) => [category, decimal(amount)])), reconciliado: value.reconciled,
    }));
    return {
      payments: { data: natureRows, total_controle: decimal(total), total_me: decimal(me), percentual_me: percent(me, total), coleta: { coleta_id: 0, codigo_municipio: "TODOS", exercicio_orcamento: String(year), referencia_empenhos_inicio: "", referencia_empenhos_fim: "", referencia_pagamentos_inicio: "", referencia_pagamentos_fim: "", orgaos_excluidos: [], regra_mei: "", fonte_cadastral: "", referencia_base_cadastral: "", status: "agregado" }, pendencias: [], observacao: "Soma das coletas municipais retornadas pela API; não existe coleta estadual única." },
      localAmount: missingLocal ? null : decimal(localTotal),
      localError: missingLocal ? `Não foi possível confirmar os pagamentos locais de ${missingLocal} município(s).` : null,
      rows: rows.sort((a, b) => Number(b.total) - Number(a.total)), requested: municipalities.length, failed: municipalities.length - rows.length,
    };
  })();
  cache.set(key, { expires: Date.now() + 5 * 60_000, promise: pending });
  pending.catch(() => cache.delete(key));
  return pending;
}
