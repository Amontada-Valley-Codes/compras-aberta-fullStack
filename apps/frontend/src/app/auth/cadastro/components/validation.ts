import { z } from 'zod'

import { onlyDigits } from '@/lib/format-br'

// Regras usadas pelos dois cadastros (ME e Gestor Público). Seguem as do
// backend (utils/validation.ts), com mensagens pensadas para o formulário.

export const CNPJ_INVALID = 'CNPJ inválido. Confira os números digitados.'

export function isValidCnpj(digits: string) {
  if (!/^\d{14}$/.test(digits) || /^(\d)\1{13}$/.test(digits)) return false

  const checkDigit = (length: number) => {
    const weights =
      length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }

  return checkDigit(12) === Number(digits[12]) && checkDigit(13) === Number(digits[13])
}

export const cnpjField = z
  .string()
  .refine((value) => onlyDigits(value).length === 14, 'Informe os 14 dígitos do CNPJ.')
  .refine((value) => isValidCnpj(onlyDigits(value)), CNPJ_INVALID)

export const emailField = (requiredMessage: string) =>
  z
    .string()
    .trim()
    .min(1, requiredMessage)
    .max(254, 'E-mail muito longo.')
    .pipe(z.email('Informe um e-mail válido.'))

export const passwordFields = z.object({
  password: z
    .string()
    .min(6, 'A senha deve ter pelo menos 6 caracteres.')
    // O backend usa bcrypt, que só considera os primeiros 72 bytes.
    .refine((value) => new TextEncoder().encode(value).length <= 72, 'A senha está longa demais.'),
  passwordConfirmation: z.string().min(1, 'Repita a senha para confirmar.'),
})

// Uso: schema.refine(passwordsMatch.check, passwordsMatch.params)
export const passwordsMatch = {
  check: (data: { password: string; passwordConfirmation: string }) =>
    data.password === data.passwordConfirmation,
  params: {
    message: 'As senhas não conferem.',
    path: ['passwordConfirmation'],
    // Só compara quando as duas senhas já são válidas por si só.
    when: (payload: { value: unknown }) => passwordFields.safeParse(payload.value).success,
  },
}

// Primeiro erro de cada campo, na ordem em que os campos aparecem na tela
// (é essa ordem que decide qual campo recebe o foco).
export function firstErrorPerField<F extends string>(error: z.ZodError) {
  const errors: Partial<Record<F, string>> = {}
  for (const issue of error.issues) {
    const field = issue.path[0] as F
    errors[field] ??= issue.message
  }
  return errors
}

// O backend responde { message, issues?: { fieldErrors } }. Devolve a
// mensagem e o primeiro erro de cada campo, já com o nome usado na tela.
export function readServerError<F extends string>(
  body: unknown,
  fieldMap: Record<string, F>,
  fallbackMessage: string,
) {
  const data = body as {
    message?: string
    issues?: { fieldErrors?: Record<string, string[] | undefined> }
  } | null
  const fieldErrors: Partial<Record<F, string>> = {}

  for (const [key, errors] of Object.entries(data?.issues?.fieldErrors ?? {})) {
    const field = fieldMap[key]
    if (field && errors?.[0]) fieldErrors[field] = errors[0]
  }

  return { message: data?.message ?? fallbackMessage, fieldErrors }
}
