export const money = (value: string | number | null | undefined) => {
  if (value == null || value === "" || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(value));
};

export const compactMoney = (value: string | number | null | undefined) => {
  if (value == null || value === "" || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(Number(value));
};

export const count = (value: number | null | undefined) =>
  value == null ? "—" : value.toLocaleString("pt-BR");

export const percent = (value: number | null | undefined) => {
  const numeric = Number(value);
  return value == null || !Number.isFinite(numeric)
    ? "Sem dados"
    : `${numeric.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
};

export function formatCnpj(value: string | null): string {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length === 14
    ? `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
    : value || "Não informado";
}
