import type { PaymentOverview } from "@/features/public-data/all-municipality-payments";

export function selectPaymentNatures(summary: PaymentOverview | null, natureCode?: string) {
  return (summary?.data ?? []).filter((row) => !natureCode || row.codigo_natureza === natureCode);
}
export function selectPaymentTotals(summary: PaymentOverview | null, natureCode?: string) {
  const rows = selectPaymentNatures(summary, natureCode);
  const row = natureCode ? rows[0] : null;
  return {
    total: natureCode ? row?.total_controle : summary?.total_controle,
    me: natureCode ? row?.valor_me : summary?.total_me,
    percentage: natureCode ? row?.percentual_me : summary?.percentual_me,
    payments: rows.length ? rows.reduce((sum, item) => sum + item.quantidade_pagamentos, 0) : null,
  };
}
