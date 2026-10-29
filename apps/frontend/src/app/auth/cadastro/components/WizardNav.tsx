import { ChevronLeft, ChevronRight, CircleAlert, Loader2 } from 'lucide-react'

import { ALERT_ID } from './useWizard'

interface WizardNavProps {
  alert: string | null
  isReview: boolean
  pending: boolean
  submitLabel: string
  pendingLabel: string
  onBack: () => void
  // Depois de um "Editar" na revisão, evita ter de passar por todas as etapas de novo.
  onBackToReview?: () => void
}

// Alerta geral + Voltar / Próximo (ou o envio, na revisão). O "Próximo" é o
// submit do formulário, então Enter em qualquer campo também avança.
export const WizardNav = ({
  alert,
  isReview,
  pending,
  submitLabel,
  pendingLabel,
  onBack,
  onBackToReview,
}: WizardNavProps) => (
  <>
    {alert && (
      <p id={ALERT_ID} className='auth-alert' role='alert' tabIndex={-1}>
        <CircleAlert size={18} aria-hidden='true' />
        <span>{alert}</span>
      </p>
    )}

    <div className='auth-wizard-nav'>
      <button
        type='button'
        className='button button-ghost auth-wizard-back'
        onClick={onBack}
        disabled={pending}>
        <ChevronLeft size={18} aria-hidden='true' />
        <span className='auth-wizard-back-text'>Voltar</span>
      </button>
      <button type='submit' className='button button-primary auth-submit' disabled={pending}>
        {isReview ? (
          <>
            {pending && <Loader2 className='auth-submit-spinner' size={18} />}
            {pending ? pendingLabel : submitLabel}
          </>
        ) : (
          <>
            Próximo
            <ChevronRight size={18} />
          </>
        )}
      </button>
    </div>

    {onBackToReview && (
      <button type='button' className='auth-wizard-shortcut' onClick={onBackToReview}>
        Voltar para a revisão
      </button>
    )}
  </>
)
