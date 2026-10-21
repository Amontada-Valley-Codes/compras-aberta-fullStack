import { Check } from 'lucide-react'

import { PROGRESS_ID } from './useWizard'

interface WizardProgressProps {
  steps: readonly string[]
  current: number
  // Maior etapa já alcançada: as anteriores a ela contam como concluídas.
  furthest: number
  // Sem onSelect, nenhuma etapa é clicável (tela de escolha de perfil).
  onSelect?: (step: number) => void
}

export const WizardProgress = ({ steps, current, furthest, onSelect }: WizardProgressProps) => {
  const percent = ((current + 1) / steps.length) * 100

  return (
    <nav id={PROGRESS_ID} className='auth-steps' aria-label='Etapas do cadastro'>
      {/* Celular: só o texto e a barra; a lista completa não cabe. */}
      <div className='auth-steps-compact'>
        <div className='auth-steps-compact-text'>
          <span>
            Etapa {current + 1} de {steps.length}
          </span>
          <b>{steps[current]}</b>
        </div>
        <div className='auth-steps-bar' aria-hidden='true'>
          <span style={{ width: `${percent}%` }} />
        </div>
      </div>

      <ol className='auth-steps-list'>
        {steps.map((label, index) => {
          const isCurrent = index === current
          const isDone = index < furthest && !isCurrent
          const state = isCurrent ? 'is-current' : isDone ? 'is-done' : 'is-upcoming'
          const reached = index <= Math.max(current, furthest) ? ' is-reached' : ''
          const content = (
            <>
              <span className='auth-steps-marker' aria-hidden='true'>
                {isDone ? <Check size={14} strokeWidth={3} /> : index + 1}
              </span>
              <span className='auth-steps-label'>{label}</span>
            </>
          )

          return (
            <li
              key={label}
              className={`auth-steps-item ${state}${reached}`}
              aria-current={isCurrent ? 'step' : undefined}>
              {isDone && onSelect ? (
                <button
                  type='button'
                  onClick={() => onSelect(index)}
                  aria-label={`Etapa ${index + 1}, ${label}, concluída. Voltar para esta etapa`}>
                  {content}
                </button>
              ) : (
                <span>{content}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
