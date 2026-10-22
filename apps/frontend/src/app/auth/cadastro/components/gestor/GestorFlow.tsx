'use client'

import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'

import { useWizard } from '../useWizard'
import { WizardNav } from '../WizardNav'
import { WizardProgress } from '../WizardProgress'
import { WizardStep } from '../WizardStep'
import {
  GESTOR_FIELD_STEP,
  GESTOR_STEPS,
  STEP_REVISAO,
  STEP_SERVIDOR,
  buildGestorPayload,
  mapGestorServerError,
  validateGestorStep,
  type GestorData,
  type GestorField,
} from './form'
import { StepRevisao } from './StepRevisao'
import { StepServidor } from './StepServidor'

const PROGRESS_STEPS = ['Perfil', ...GESTOR_STEPS.map((step) => step.label)]

interface GestorFlowProps {
  // O estado fica no CadastroWizard: voltar para a escolha de perfil não apaga nada.
  data: GestorData
  setData: Dispatch<SetStateAction<GestorData>>
  onExit: () => void
  onSent: (email: string) => void
}

export const GestorFlow = ({ data, setData, onExit, onSent }: GestorFlowProps) => {
  const [pending, setPending] = useState(false)
  const wizard = useWizard<GestorField>({
    reviewStep: STEP_REVISAO,
    fieldStep: GESTOR_FIELD_STEP,
    validateStep: (step) => validateGestorStep(step, data),
  })
  const { step, furthest, errors, isReview } = wizard

  function updateData(patch: Partial<GestorData>) {
    setData((prev) => ({ ...prev, ...patch }))
    const fields = Object.keys(patch) as GestorField[]
    // A mensagem "senhas não conferem" depende dos dois campos.
    if ('password' in patch) fields.push('passwordConfirmation')
    wizard.clearErrors(fields)
  }

  async function submit() {
    if (!wizard.validateAll()) return
    setPending(true)

    try {
      const response = await fetch('/api/managers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildGestorPayload(data)),
      })
      const body = await response.json().catch(() => null)

      if (!response.ok) {
        const { message, fieldErrors } = mapGestorServerError(response.status, body)
        wizard.showServerError(message, fieldErrors)
        setPending(false)
        return
      }

      onSent(data.email.trim())
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
        <WizardStep key={step} title={GESTOR_STEPS[step].title} hint={GESTOR_STEPS[step].hint}>
          {step === STEP_SERVIDOR && <StepServidor data={data} errors={errors} onChange={updateData} />}
          {isReview && <StepRevisao data={data} onEdit={wizard.goTo} />}
        </WizardStep>

        <WizardNav
          alert={wizard.alert}
          isReview={isReview}
          pending={pending}
          submitLabel='Criar conta de gestor'
          pendingLabel='Criando conta…'
          onBack={() => (step === STEP_SERVIDOR ? onExit() : wizard.goTo(step - 1))}
          onBackToReview={
            !isReview && furthest === STEP_REVISAO ? () => wizard.goTo(STEP_REVISAO) : undefined
          }
        />
      </form>
    </>
  )
}
