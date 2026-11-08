import type { MunicipalityDetailData } from "./municipality-detail-data";
import { titleCase } from "@/features/public-data/plain-language";

export type NatureMetric = "dotacoes" | "pagamentos";
export function buildDetailNatureRows(data: MunicipalityDetailData, metric: NatureMetric) {
  const source = data.history.find((item) => item.year === data.analysis.filters.year);
  const rows = metric === "dotacoes"
    ? source?.expenses.data?.data.map((item) => ({ code: item.codigo_natureza, label: item.nome_natureza, value: Number(item.valor_total_dotacao) }))
    : source?.payments.data?.data.map((item) => ({ code: item.codigo_natureza, label: item.nome_natureza, value: Number(item.total_controle) }));
  return rows?.sort((a, b) => b.value - a.value) ?? [];
}
export function buildDetailHistory(data: MunicipalityDetailData, metric: NatureMetric, code: string) {
  return [...data.history].sort((a, b) => a.year - b.year).map((item) => {
    const row = metric === "dotacoes" ? item.expenses.data?.data.find((row) => row.codigo_natureza === code) : item.payments.data?.data.find((row) => row.codigo_natureza === code);
    // Ausência de cobertura ou falha não significa valor zero.
    return { year: item.year, value: row ? Number("valor_total_dotacao" in row ? row.valor_total_dotacao : row.total_controle) : null };
  });
}
export function buildDetailWinners(data: MunicipalityDetailData) {
  const monthly = Array.from({ length: 12 }, () => 0);
  let undatedValue = 0;
  const groups = new Map<string, { id: string; name: string; cnpj: string; size: string; origin: string; total: number }>();
  for (const row of data.winners.data ?? []) {
    const month = Number(row.data_realizacao_licitacao?.slice(5, 7));
    if (month >= 1 && month <= 12) monthly[month - 1] += Number(row.valor_total_vencido);
    else undatedValue += Number(row.valor_total_vencido);
    const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
    const origin = !row.municipio_empresa || !row.uf_empresa ? "Não informada"
      : row.uf_empresa === "CE" && normalize(row.municipio_empresa) === normalize(data.analysis.selectedMunicipality?.name ?? "") ? "Local"
      : row.uf_empresa === "CE" ? "Outro município do CE" : "Outro estado";
    const supplier = groups.get(row.cnpj) ?? { id: row.cnpj, cnpj: row.cnpj, name: titleCase(row.empresa ?? "Empresa não informada"), size: row.porte_empresa ?? "ME", origin, total: 0 };
    supplier.total += Number(row.valor_total_vencido);
    groups.set(row.cnpj, supplier);
  }
  return { monthly, undatedValue, suppliers: [...groups.values()].sort((a, b) => b.total - a.total) };
}
