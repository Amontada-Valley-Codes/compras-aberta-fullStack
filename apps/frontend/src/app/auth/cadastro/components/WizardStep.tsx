import type { ReactNode } from 'react'

import { STEP_TITLE_ID } from './useWizard'

interface WizardStepProps {
  title: string
  hint?: string
  children: ReactNode
}

// Moldura de cada etapa. O título recebe o foco ao trocar de etapa, para o
// leitor de tela anunciar onde a pessoa está. Use com key={etapa} para a
// animação de entrada rodar a cada troca.
export const WizardStep = ({ title, hint, children }: WizardStepProps) => (
  <div className='auth-section auth-step-enter' role='group' aria-labelledby={STEP_TITLE_ID}>
    <div className='auth-section-head'>
      <h2 id={STEP_TITLE_ID} className='auth-section-title' tabIndex={-1}>
        {title}
      </h2>
    </div>
    {hint && <p className='auth-section-hint'>{hint}</p>}
    {children}
  </div>
)
