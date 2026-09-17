import { api } from "@/api/client";
import { expensesByNatureQuerySchema } from "@/schemas/analytics/list-expenses-by-nature.schema";
import type { ExpensesByNatureResponse, PeriodQuery } from "./analytics.types";

export async function listExpensesByNatureService(query: PeriodQuery = {}): Promise<ExpensesByNatureResponse> {
  const { data } = await api.get<ExpensesByNatureResponse>("/analytics/gastos-por-natureza", {
    params: expensesByNatureQuerySchema.parse(query),
  });
  return data;
}
