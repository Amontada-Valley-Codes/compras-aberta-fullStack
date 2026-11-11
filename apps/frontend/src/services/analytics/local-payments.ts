import { listLocalPaymentsService, listPaymentSuppliersService } from "./payments.service";
import type { LocalPaymentResponse } from "./payments.types";

export interface LocalPaymentSummary {
  mePayments: number;
  localAmount: string;
  percentage: number | null;
  localSuppliers: number;
  localPaymentCount: number;
}

export async function loadLocalPayments(query: {
  codigo_municipio: string;
  ano: number;
  coleta_id: number;
  codigo_natureza?: string;
}): Promise<LocalPaymentSummary> {
  const localQuery = { ...query, limit: 100, offset: 0 };
  const [local, mePayments] = await Promise.all([
    listLocalPaymentsService(localQuery),
    (async () => {
      let count = 0;
      for (let offset = 0; ; offset += 100) {
        const page = await listPaymentSuppliersService({
          ...query, categoria_porte: "ME", limit: 100, offset,
        });
        if (page.coleta_id !== query.coleta_id || page.offset !== offset) {
          throw new Error("Coleta ou página divergente nos pagamentos de ME");
        }
        count += page.data.reduce((total, row) => total + row.quantidade_pagamentos, 0);
        if (page.data.length < 100) return count;
      }
    })(),
  ]);
  if (local.coleta_id !== query.coleta_id || local.ano !== query.ano) {
    throw new Error("Coleta ou exercício divergente no endpoint de ME locais");
  }
  if (local.data.some((row) => row.categoria_porte !== "ME" || row.codigo_municipio !== query.codigo_municipio)) {
    throw new Error("O endpoint de ME locais retornou registros fora do filtro");
  }
  const expectedNature = query.codigo_natureza;
  if (expectedNature && local.data.some((row) => row.codigo_natureza !== expectedNature)) {
    throw new Error("O endpoint de ME locais retornou outra natureza");
  }
  const summary: LocalPaymentResponse["resumo"] = local.resumo;
  return {
    mePayments,
    localAmount: summary.valor_pago_me_local,
    percentage: summary.percentual_valor_pago_me_local,
    localSuppliers: summary.fornecedores_me_locais,
    localPaymentCount: summary.pagamentos_me_locais,
  };
}
