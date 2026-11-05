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

// Estado, regras de validação e envio do cadastro de Microempresa.
// Cada etapa tem o seu schema: o wizard só deixa avançar quando ele passa.

export const ME_STEPS = [
  {
    label: 'Responsável',
    title: 'Dados do responsável',
    hint: 'Com o e-mail e a senha você entra na plataforma depois da aprovação.',
  },
  {
    label: 'Empresa',
    title: 'Dados da empresa',
    hint: 'Ao digitar o CNPJ, buscamos a razão social na Receita Federal.',
  },
  {
    label: 'Documentos',
    title: 'Comprovantes',
    hint: 'Anexe os 4 documentos em PDF, PNG ou JPG, com até 5 MB cada.',
  },
  {
    label: 'Revisão',
    title: 'Revise seus dados',
    hint: 'Confira tudo antes de enviar. Para corrigir algo, use o "Editar" do bloco.',
  },
] as const

export const STEP_RESPONSAVEL = 0
export const STEP_EMPRESA = 1
export const STEP_DOCUMENTOS = 2
export const STEP_REVISAO = 3

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

export const DOCUMENTS = [
  { field: 'cartao_cnpj', title: 'Cartão CNPJ' },
  { field: 'contrato_social', title: 'Contrato Social' },
  { field: 'comprovante_endereco', title: 'Comprovante de Endereço' },
  { field: 'comprovante_socio', title: 'Comprovante dos Sócios' },
] as const

export type DocumentField = (typeof DOCUMENTS)[number]['field']

// Opções de porte da empresa para cadastro de fornecedores
export const PORTES = [
  { value: 'ME', label: 'Microempresa (ME)' },
  { value: 'EPP', label: 'Empresa de Pequeno Porte (EPP)' },
  { value: 'MEI', label: 'Microempreendedor Individual (MEI)' },
] as const

export type Porte = (typeof PORTES)[number]['value'] | ''

export interface MEData {
  usuario: string
  email: string
  password: string
  passwordConfirmation: string
  cnpj: string // com máscara; só os dígitos vão para o backend
  nome_empresa: string
  porte_empresa: Porte
  files: Partial<Record<DocumentField, File>>
}

export type MEField = Exclude<keyof MEData, 'files'> | DocumentField

export const ME_INITIAL_DATA: MEData = {
  usuario: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  cnpj: '',
  nome_empresa: '',
  porte_empresa: '',
  files: {},
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

// Nomes muito longos tornam a mensagem de erro ilegível: mantém o começo e o fim.
function shortenFileName(name: string) {
  return name.length > 40 ? `${name.slice(0, 24)}…${name.slice(-14)}` : name
}

// Mesma lista do backend (utils/upload.ts), que confere o tipo informado pelo
// navegador e não a extensão: um ".pdf" sem tipo seria recusado lá.
const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg']

export const documentFileSchema = z
  .custom<File>((value) => typeof File !== 'undefined' && value instanceof File, 'Anexe este documento.')
  .refine(
    (file) => ACCEPTED_MIME_TYPES.includes(file.type),
    'Formato não aceito. Envie um arquivo PDF, PNG ou JPG.',
  )
  .refine((file) => file.size <= MAX_FILE_SIZE_BYTES, {
    error: (issue) => {
      const file = issue.input as File
      return `O arquivo "${shortenFileName(file.name)}" tem ${formatFileSize(file.size)} e passa do limite de 5 MB.`
    },
  })

const responsavelSchema = z
  .object({
    usuario: z
      .string()
      .trim()
      .min(3, 'Informe o nome completo (mínimo de 3 caracteres).')
      .max(120, 'O nome pode ter no máximo 120 caracteres.'),
    email: emailField('Informe o e-mail.'),
    ...passwordFields.shape,
  })
  .refine(passwordsMatch.check, passwordsMatch.params)

const empresaSchema = z.object({
  cnpj: cnpjField,
  nome_empresa: z
    .string()
    .trim()
    .min(2, 'Informe a razão social ou o nome fantasia.')
    .max(200, 'O nome pode ter no máximo 200 caracteres.'),
  porte_empresa: z.enum(['ME', 'EPP', 'MEI'], {
    message: 'Selecione o porte da empresa.',
  }),
})

const documentosSchema = z.object(
  Object.fromEntries(DOCUMENTS.map(({ field }) => [field, documentFileSchema])) as Record<
    DocumentField,
    typeof documentFileSchema
  >,
)

export function validateMEStep(step: number, data: MEData): FieldErrors<MEField> {
  const result =
    step === STEP_RESPONSAVEL
      ? responsavelSchema.safeParse(data)
      : step === STEP_EMPRESA
        ? empresaSchema.safeParse(data)
        : step === STEP_DOCUMENTOS
          ? documentosSchema.safeParse(data.files)
          : null

  return !result || result.success ? {} : firstErrorPerField<MEField>(result.error)
}

export const ME_FIELD_STEP: Record<MEField, number> = {
  usuario: STEP_RESPONSAVEL,
  email: STEP_RESPONSAVEL,
  password: STEP_RESPONSAVEL,
  passwordConfirmation: STEP_RESPONSAVEL,
  cnpj: STEP_EMPRESA,
  nome_empresa: STEP_EMPRESA,
  porte_empresa: STEP_EMPRESA,
  cartao_cnpj: STEP_DOCUMENTOS,
  contrato_social: STEP_DOCUMENTOS,
  comprovante_endereco: STEP_DOCUMENTOS,
  comprovante_socio: STEP_DOCUMENTOS,
}

// Monta o envio na hora, a partir do estado: os inputs das outras etapas já
// não estão na tela. Mesmos campos que o POST /api/business/register espera.
export function buildMEFormData(data: MEData) {
  const formData = new FormData()
  formData.set('usuario', data.usuario.trim())
  formData.set('email', data.email.trim())
  formData.set('password', data.password)
  formData.set('cnpj', onlyDigits(data.cnpj))
  formData.set('nome_empresa', data.nome_empresa.trim())
  formData.set('porte_empresa', data.porte_empresa)
  for (const { field } of DOCUMENTS) {
    const file = data.files[field]
    if (file) formData.set(field, file)
  }
  return formData
}

const SERVER_FIELDS = Object.fromEntries(
  Object.keys(ME_FIELD_STEP).map((field) => [field, field as MEField]),
)

// Traduz o erro do backend em "qual campo marcar"; sem campo identificável,
// erros de arquivo reabrem os comprovantes e o resto fica na revisão.
export function mapMEServerError(status: number, body: unknown) {
  const { message, fieldErrors } = readServerError<MEField>(
    body,
    SERVER_FIELDS,
    'Não foi possível realizar o cadastro. Verifique os dados.',
  )

  // 409 "E-mail já cadastrado" / "CNPJ já cadastrado", ou a violação de
  // unicidade do Prisma ("Já existe um cadastro com este email").
  if (status === 409) {
    if (/e-?mail/i.test(message)) fieldErrors.email = message
    else if (/cnpj/i.test(message)) fieldErrors.cnpj = message
  }

  // "Arquivos obrigatórios faltando: cartao_cnpj, contrato_social"
  for (const { field } of DOCUMENTS) {
    if (message.includes('faltando') && message.includes(field)) {
      fieldErrors[field] = 'Anexe este documento.'
    }
  }

  const fallbackStep = /arquivo/i.test(message) ? STEP_DOCUMENTOS : STEP_REVISAO
  return { message, fieldErrors, fallbackStep }
}
