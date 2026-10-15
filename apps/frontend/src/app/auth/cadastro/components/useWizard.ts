import { useEffect, useRef, useState } from 'react'

export const PROGRESS_ID = 'cadastro-progresso'
export const STEP_TITLE_ID = 'cadastro-etapa-titulo'
export const ALERT_ID = 'cadastro-alerta'

export type FieldErrors<F extends string> = Partial<Record<F, string>>

interface WizardOptions<F extends string> {
  reviewStep: number
  fieldStep: Record<F, number>
  validateStep: (step: number) => FieldErrors<F>
}

// Navegação do passo a passo, compartilhada pelos cadastros de ME e de Gestor:
// etapa atual, validação ao avançar, erros por campo e foco.
export function useWizard<F extends string>({ reviewStep, fieldStep, validateStep }: WizardOptions<F>) {
  const [step, setStep] = useState(0)
  // Maior etapa já alcançada: as anteriores a ela já passaram na validação.
  const [furthest, setFurthest] = useState(0)
  const [errors, setErrors] = useState<FieldErrors<F>>({})
  const [alert, setAlert] = useState<string | null>(null)
  // Elemento que deve receber o foco depois da próxima renderização: o título
  // da etapa nova, o primeiro campo com erro ou o alerta.
  const pendingFocus = useRef<string | null>(null)

  useEffect(() => {
    const id = pendingFocus.current
    if (!id) return
    pendingFocus.current = null

    const target = document.getElementById(id)
    if (!target) return
    target.focus({ preventScroll: true })
    // Ao trocar de etapa, volta para o topo do passo a passo (no celular o
    // título pode ter ficado fora da tela).
    const scrollTarget = id === STEP_TITLE_ID ? document.getElementById(PROGRESS_ID) : target
    scrollTarget?.scrollIntoView({ block: id === STEP_TITLE_ID ? 'nearest' : 'center' })
  })

  // Primeira etapa (entre from e to, sem incluir to) que não passa na validação.
  function findInvalidStep(from: number, to: number) {
    for (let current = from; current < to; current++) {
      const stepErrors = validateStep(current)
      if (Object.keys(stepErrors).length > 0) return { step: current, errors: stepErrors }
    }
    return null
  }

  function clearErrors(fields: F[]) {
    setErrors((prev) => {
      if (!fields.some((field) => field in prev)) return prev
      const next = { ...prev }
      for (const field of fields) delete next[field]
      return next
    })
  }

  function setFieldError(field: F, message: string) {
    setErrors((prev) => ({ ...prev, [field]: message }))
  }

  function showErrors(target: number, stepErrors: FieldErrors<F>) {
    setErrors((prev) => ({ ...prev, ...stepErrors }))
    pendingFocus.current = Object.keys(stepErrors)[0] ?? STEP_TITLE_ID
    setStep(target)
  }

  // Voltar é livre. Para avançar (pelo "Próximo", pela barra ou pela revisão),
  // todas as etapas no caminho precisam estar válidas.
  function goTo(target: number) {
    const invalid = findInvalidStep(step, target)
    if (invalid) {
      showErrors(invalid.step, invalid.errors)
      return
    }

    // Erros antigos das etapas que acabaram de validar (ex.: "E-mail já
    // cadastrado" vindo do backend) não valem mais.
    setErrors((prev) => {
      const next = { ...prev }
      for (const field of Object.keys(prev) as F[]) {
        if (fieldStep[field] >= step && fieldStep[field] < target) delete next[field]
      }
      return next
    })
    setAlert(null)
    pendingFocus.current = STEP_TITLE_ID
    setStep(target)
    setFurthest((prev) => Math.max(prev, target))
  }

  // A revisão permite editar as etapas: antes de enviar, confere tudo de novo.
  function validateAll() {
    const invalid = findInvalidStep(0, reviewStep)
    if (invalid) showErrors(invalid.step, invalid.errors)
    return !invalid
  }

  function showAlert(message: string) {
    setAlert(message)
    pendingFocus.current = ALERT_ID
  }

  // Erro devolvido pelo backend no envio: reabre a etapa do primeiro campo
  // com erro ou, sem campo identificável, mostra a mensagem na fallbackStep.
  function showServerError(message: string, fieldErrors: FieldErrors<F>, fallbackStep = reviewStep) {
    const fields = Object.keys(fieldErrors) as F[]
    if (fields.length > 0) {
      setAlert('Não foi possível concluir o envio. Corrija o que está destacado e envie de novo.')
      showErrors(Math.min(...fields.map((field) => fieldStep[field])), fieldErrors)
      return
    }
    showAlert(message)
    setStep(fallbackStep)
  }

  return {
    step,
    furthest,
    errors,
    alert,
    isReview: step === reviewStep,
    goTo,
    clearErrors,
    setFieldError,
    validateAll,
    showAlert,
    showServerError,
  }
}
