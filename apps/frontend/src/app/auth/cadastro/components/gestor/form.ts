import { z } from 'zod'

import type { FieldErrors } from '../useWizard'
import {
  emailField,
  firstErrorPerField,
  passwordFields,
  passwordsMatch,
  readServerError,
} from '../validation'

// Estado, regras e envio do cadastro do Gestor Público. Diferente da ME, não
// há solicitação nem aprovação: o POST /api/managers/register já cria a conta
// de gestor (MANAGER), e o login leva direto ao painel.
// As regras seguem as do backend (registerManagerSchema, em user.controller.ts).

export const GESTOR_STEPS = [
  {
    label: 'Servidor',
    title: 'Dados do servidor',
    hint: 'Use o e-mail institucional ou de trabalho. Com ele e a senha você entra no painel da sua prefeitura.',
  },
  {
    label: 'Revisão',
    title: 'Revise e crie sua conta',
    hint: 'Confira as informações antes de enviar. Para corrigir algo, use o "Editar" do bloco.',
  },
] as const

export const STEP_SERVIDOR = 0
export const STEP_REVISAO = 1

export interface GestorData {
  name: string
  email: string
  password: string
  passwordConfirmation: string
}

export type GestorField = keyof GestorData

export const GESTOR_INITIAL_DATA: GestorData = {
  name: '',
  email: '',
  password: '',
  passwordConfirmation: '',
}

const servidorSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'Informe o nome completo (mínimo de 3 caracteres).')
      .max(120, 'O nome pode ter no máximo 120 caracteres.'),
    email: emailField('Informe o e-mail institucional.'),
    ...passwordFields.shape,
  })
  .refine(passwordsMatch.check, passwordsMatch.params)

export function validateGestorStep(step: number, data: GestorData): FieldErrors<GestorField> {
  const result = step === STEP_SERVIDOR ? servidorSchema.safeParse(data) : null

  return !result || result.success ? {} : firstErrorPerField<GestorField>(result.error)
}

export const GESTOR_FIELD_STEP: Record<GestorField, number> = {
  name: STEP_SERVIDOR,
  email: STEP_SERVIDOR,
  password: STEP_SERVIDOR,
  passwordConfirmation: STEP_SERVIDOR,
}

// Corpo do POST /api/managers/register.
export function buildGestorPayload(data: GestorData) {
  return {
    name: data.name.trim(),
    email: data.email.trim(),
    password: data.password,
  }
}

// Nome do campo no backend -> nome do campo na tela.
const SERVER_FIELDS: Record<string, GestorField> = {
  name: 'name',
  email: 'email',
  password: 'password',
}

export function mapGestorServerError(status: number, body: unknown) {
  const { message, fieldErrors } = readServerError<GestorField>(
    body,
    SERVER_FIELDS,
    'Não foi possível criar a sua conta. Tente novamente.',
  )

  // 409 "E-mail já cadastrado".
  if (status === 409 && /e-?mail/i.test(message)) fieldErrors.email = message

  return { message, fieldErrors }
}
