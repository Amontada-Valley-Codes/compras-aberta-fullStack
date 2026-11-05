'use client'

import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { useRouter } from 'next/navigation'

import { toast } from '@/components/ui/sonner'
import { formatCnpj, onlyDigits } from '@/lib/format-br'
import { useCnpjLookup } from '../useCnpjLookup'
import { useWizard } from '../useWizard'
import { CNPJ_INVALID, isValidCnpj } from '../validation'
import { WizardNav } from '../WizardNav'
import { WizardProgress } from '../WizardProgress'
import { WizardStep } from '../WizardStep'
import {
  ME_FIELD_STEP,
  ME_STEPS,
  STEP_DOCUMENTOS,
  STEP_EMPRESA,
  STEP_RESPONSAVEL,
  STEP_REVISAO,
  buildMEFormData,
  documentFileSchema,
  mapMEServerError,
  validateMEStep,
  type DocumentField,
  type MEData,
  type MEField,
  type Porte,
} from './form'
import { StepDocumentos } from './StepDocumentos'
import { StepEmpresa } from './StepEmpresa'
import { StepResponsavel } from './StepResponsavel'
import { StepRevisao } from './StepRevisao'

const PROGRESS_STEPS = ['Perfil', ...ME_STEPS.map((step) => step.label)]

interface MEFlowProps {
  // O estado fica no CadastroWizard: voltar para a escolha de perfil não apaga nada.
  data: MEData
  setData: Dispatch<SetStateAction<MEData>>
  onExit: () => void
}

export const MEFlow = ({ data, setData, onExit }: MEFlowProps) => {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const wizard = useWizard<MEField>({
    reviewStep: STEP_REVISAO,
    fieldStep: ME_FIELD_STEP,
    validateStep: (step) => validateMEStep(step, data),
  })
  const { step, furthest, errors, isReview } = wizard

  const cnpjLookup = useCnpjLookup((company) => {
    const rawPorte = company.porte?.toUpperCase() || ''
    const detectedPorte: Porte | undefined = rawPorte.includes('EPP')
      ? 'EPP'
      : rawPorte.includes('MEI')
        ? 'MEI'
        : rawPorte.includes('ME')
          ? 'ME'
          : undefined

    updateData({
      nome_empresa: company.razaoSocial,
      ...(detectedPorte ? { porte_empresa: detectedPorte } : {}),
    })
  })

  function updateData(patch: Partial<MEData>) {
    setData((prev) => ({ ...prev, ...patch }))
    const fields = Object.keys(patch) as MEField[]
    // A mensagem "senhas não conferem" depende dos dois campos.
    if ('password' in patch) fields.push('passwordConfirmation')
    wizard.clearErrors(fields)
  }

  function handleCnpjChange(value: string) {
    const cnpj = formatCnpj(value)
    const digits = onlyDigits(cnpj)
    updateData({ cnpj })

    if (digits.length < 14) {
      cnpjLookup.reset()
    } else if (!isValidCnpj(digits)) {
      cnpjLookup.reset()
      wizard.setFieldError('cnpj', CNPJ_INVALID)
    } else {
      void cnpjLookup.search(digits)
    }
  }

  // Arquivo inválido (tamanho ou formato) não substitui o que já estava anexado.
  function handleFileSelect(field: DocumentField, file: File) {
    const result = documentFileSchema.safeParse(file)
    if (!result.success) {
      wizard.setFieldError(field, result.error.issues[0].message)
      return
    }
    setData((prev) => ({ ...prev, files: { ...prev.files, [field]: file } }))
    wizard.clearErrors([field])
  }

  function handleFileRemove(field: DocumentField) {
    setData((prev) => {
      const files = { ...prev.files }
      delete files[field]
      return { ...prev, files }
    })
    wizard.clearErrors([field])
  }

  async function submit() {
    if (!wizard.validateAll()) return
    setPending(true)

    try {
      const response = await fetch('/api/business/register', {
        method: 'POST',
        body: buildMEFormData(data),
      })
      const body = await response.json().catch(() => null)

      if (!response.ok) {
        const { message, fieldErrors, fallbackStep } = mapMEServerError(response.status, body)
        wizard.showServerError(message, fieldErrors, fallbackStep)
        setPending(false)
        return
      }

      toast.success('Solicitação cadastral enviada com sucesso!', {
        description:
          body?.message ??
          'Seus dados e comprovantes foram recebidos e estão em análise pelo administrador. Você receberá um aviso assim que for aprovada.',
        duration: 8000,
      })

      router.push('/auth/login?status=pending')
    } catch {
      wizard.showAlert('Não foi possível conectar ao servidor. Verifique sua conexão.')
      setPending(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    if (isReview) void submit()
    else wizard.goTo(step + 1)
  }

  return (
    <>
      {/* "Perfil" é a etapa 0 da barra; as do fluxo começam em 1. */}
      <WizardProgress
        steps={PROGRESS_STEPS}
        current={step + 1}
        furthest={furthest + 1}
        onSelect={(index) => (index === 0 ? onExit() : wizard.goTo(index - 1))}
      />

      {/* noValidate: as mensagens vêm do Zod, embaixo de cada campo. */}
      <form className='auth-form' onSubmit={handleSubmit} noValidate>
        <WizardStep key={step} title={ME_STEPS[step].title} hint={ME_STEPS[step].hint}>
          {step === STEP_RESPONSAVEL && (
            <StepResponsavel data={data} errors={errors} onChange={updateData} />
          )}
          {step === STEP_EMPRESA && (
            <StepEmpresa
              data={data}
              errors={errors}
              lookup={cnpjLookup.lookup}
              onCnpjChange={handleCnpjChange}
              onChange={updateData}
            />
          )}
          {step === STEP_DOCUMENTOS && (
            <StepDocumentos
              files={data.files}
              errors={errors}
              onSelect={handleFileSelect}
              onRemove={handleFileRemove}
            />
          )}
          {isReview && <StepRevisao data={data} onEdit={wizard.goTo} />}
        </WizardStep>

        <WizardNav
          alert={wizard.alert}
          isReview={isReview}
          pending={pending}
          submitLabel='Finalizar cadastro'
          pendingLabel='Enviando cadastro…'
          onBack={() => (step === STEP_RESPONSAVEL ? onExit() : wizard.goTo(step - 1))}
          onBackToReview={
            !isReview && furthest === STEP_REVISAO ? () => wizard.goTo(STEP_REVISAO) : undefined
          }
        />
      </form>
    </>
  )
}
