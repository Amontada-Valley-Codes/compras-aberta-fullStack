import { z } from 'zod'

import { onlyDigits } from '@/lib/format-br'
import type { FieldErrors } from '../useWizard'
import {
  cnpjField,
  emailField,
  firstErrorPerField,
  passwordFields,
  passwordsMatch,
  readServerError,
} from '../validation'

// Estado, regras e envio da solicitação de acesso do Gestor Público. O envio
// usa o POST /api/access-requests; as regras seguem as do backend para essa
// rota (access-request.schema.ts).

export const GESTOR_STEPS = [
  {
    label: 'Servidor',
    title: 'Dados do servidor',
    hint: 'Use o e-mail institucional ou de trabalho. Com ele e a senha você entra depois da aprovação.',
  },
  {
    label: 'Órgão',
    title: 'Município e órgão',
    hint: 'Informe onde você atua. Ao digitar o CNPJ do órgão, buscamos os dados na Receita Federal.',
  },
  {
    label: 'Revisão',
    title: 'Revise e envie',
    hint: 'Confira as informações antes de enviar. Para corrigir algo, use o "Editar" do bloco.',
  },
] as const

export const STEP_SERVIDOR = 0
export const STEP_ORGAO = 1
export const STEP_REVISAO = 2

export const MESSAGE_MAX_LENGTH = 500

export interface GestorData {
  name: string
  email: string
  phone: string // com máscara
  password: string
  passwordConfirmation: string
  municipioIbge: string // valor do select; vira número no envio
  orgao: string
  cnpj: string // com máscara
  message: string
}

export type GestorField = keyof GestorData

export const GESTOR_INITIAL_DATA: GestorData = {
  name: '',
  email: '',
  phone: '',
  password: '',
  passwordConfirmation: '',
  municipioIbge: '',
  orgao: '',
  cnpj: '',
  message: '',
}

const servidorSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'Informe o nome completo (mínimo de 3 caracteres).')
      .max(120, 'O nome pode ter no máximo 120 caracteres.'),
    email: emailField('Informe o e-mail institucional.'),
    phone: z
      .string()
      .refine((value) => /^\d{10,11}$/.test(onlyDigits(value)), 'Informe o telefone com DDD.'),
    ...passwordFields.shape,
  })
  .refine(passwordsMatch.check, passwordsMatch.params)

const orgaoSchema = z.object({
  municipioIbge: z.string().min(1, 'Selecione o município.'),
  orgao: z
    .string()
    .trim()
    .min(3, 'Informe o nome do órgão ou da prefeitura (mínimo de 3 caracteres).')
    .max(160, 'O nome pode ter no máximo 160 caracteres.'),
  cnpj: cnpjField,
  message: z
    .string()
    .trim()
    .max(MESSAGE_MAX_LENGTH, `O texto pode ter no máximo ${MESSAGE_MAX_LENGTH} caracteres.`),
})

export function validateGestorStep(step: number, data: GestorData): FieldErrors<GestorField> {
  const result =
    step === STEP_SERVIDOR
      ? servidorSchema.safeParse(data)
      : step === STEP_ORGAO
        ? orgaoSchema.safeParse(data)
        : null

  return !result || result.success ? {} : firstErrorPerField<GestorField>(result.error)
}

export const GESTOR_FIELD_STEP: Record<GestorField, number> = {
  name: STEP_SERVIDOR,
  email: STEP_SERVIDOR,
  phone: STEP_SERVIDOR,
  password: STEP_SERVIDOR,
  passwordConfirmation: STEP_SERVIDOR,
  municipioIbge: STEP_ORGAO,
  orgao: STEP_ORGAO,
  cnpj: STEP_ORGAO,
  message: STEP_ORGAO,
}

// Corpo do POST /api/access-requests. A rota foi feita para a solicitação de
// empresas: o nome do órgão vai em companyName.
export function buildGestorPayload(data: GestorData) {
  return {
    name: data.name.trim(),
    email: data.email.trim(),
    phone: data.phone,
    password: data.password,
    companyName: data.orgao.trim(),
    cnpj: data.cnpj,
    municipioIbge: Number(data.municipioIbge),
    message: data.message.trim() || undefined,
  }
}

// Nome do campo no backend -> nome do campo na tela.
const SERVER_FIELDS: Record<string, GestorField> = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  password: 'password',
  companyName: 'orgao',
  cnpj: 'cnpj',
  municipioIbge: 'municipioIbge',
  message: 'message',
}

export function mapGestorServerError(status: number, body: unknown) {
  const { message, fieldErrors } = readServerError<GestorField>(
    body,
    SERVER_FIELDS,
    'Não foi possível enviar a solicitação. Tente novamente.',
  )

  // 409 "E-mail já cadastrado" ou "Já existe uma solicitação em análise ou
  // aprovada para este CNPJ"; 400 "Município não encontrado".
  if (status === 409 && /e-?mail/i.test(message)) fieldErrors.email = message
  else if (status === 409 && /cnpj/i.test(message)) fieldErrors.cnpj = message
  else if (/munic[ií]pio/i.test(message)) fieldErrors.municipioIbge = message

  return { message, fieldErrors }
}
