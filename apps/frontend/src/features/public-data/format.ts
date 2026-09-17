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

export const percent = (value: number | null | undefined) =>
  value == null ? "Sem dados" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

export function maskCnpj(value: string | null): string {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length === 14 ? `${digits.slice(0, 2)}.${digits.slice(2, 5)}.***/****-${digits.slice(-2)}` : "Não informado";
}
