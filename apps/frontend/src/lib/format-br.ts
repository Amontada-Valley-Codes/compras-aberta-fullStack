// Máscaras de documentos brasileiros. Aceitam o valor com ou sem pontuação
// (inclusive parcial, enquanto a pessoa digita) e devolvem formatado.

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

export function formatCnpj(value: string) {
  return onlyDigits(value)
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits.replace(/^(\d{1,2})/, "($1");
  const middle = digits.length === 11 ? 5 : 4;
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(new RegExp(`\\) (\\d{${middle}})(\\d)`), ") $1-$2");
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}
