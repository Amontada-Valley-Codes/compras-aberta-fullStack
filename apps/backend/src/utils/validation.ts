import { z } from "zod";

// Campos reutilizados por mais de um módulo. A normalização (trim, minúsculas)
// acontece aqui, na borda, para que services e repositories só recebam dados
// já no formato canônico.

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "E-mail muito longo")
  .pipe(z.email("E-mail inválido"));

// bcrypt só considera os primeiros 72 bytes; acima disso, senhas diferentes
// com o mesmo prefixo gerariam o mesmo hash.
const password = z
  .string()
  .min(6, "Senha deve ter pelo menos 6 caracteres")
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Senha deve ter no máximo 72 bytes",
  );

function isValidCnpj(digits: string) {
  if (!/^\d{14}$/.test(digits) || /^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  const checkDigit = (length: number) => {
    const weights =
      length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce(
      (total, weight, index) => total + Number(digits[index]) * weight,
      0,
    );
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  return (
    checkDigit(12) === Number(digits[12]) &&
    checkDigit(13) === Number(digits[13])
  );
}

// Aceita com ou sem máscara ("12.345.678/0001-90") e guarda só os dígitos.
const cnpj = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .refine(isValidCnpj, "CNPJ inválido");

// Telefone brasileiro com DDD (fixo ou celular), guardado só com dígitos.
const phone = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .refine(
    (value) => /^\d{10,11}$/.test(value),
    "Telefone deve ter DDD e 10 ou 11 dígitos",
  );

export { cnpj, email, password, phone };
