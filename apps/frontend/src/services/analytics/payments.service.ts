import type { z } from "zod";
import { api } from "@/api/client";
import { localPaymentsQuerySchema, paymentsSummaryQuerySchema, paymentSuppliersQuerySchema } from "@/schemas/analytics/payments.schema";
import type { LocalPaymentResponse, PaymentsSummaryResponse, PaymentSuppliersResponse } from "./payments.types";

export async function getPaymentsSummaryService(query: z.input<typeof paymentsSummaryQuerySchema>) {
  const { data } = await api.get<PaymentsSummaryResponse>("/analytics/pagamentos/resumo", { params: paymentsSummaryQuerySchema.parse(query) });
  return data;
}
export async function listPaymentSuppliersService(query: z.input<typeof paymentSuppliersQuerySchema>) {
  const { data } = await api.get<PaymentSuppliersResponse>("/analytics/pagamentos/fornecedores", { params: paymentSuppliersQuerySchema.parse(query) });
  return data;
}
export async function listLocalPaymentsService(query: z.input<typeof localPaymentsQuerySchema>) {
  const { data } = await api.get<LocalPaymentResponse>("/analytics/participacoes-me-locais", { params: localPaymentsQuerySchema.parse(query) });
  return data;
}
