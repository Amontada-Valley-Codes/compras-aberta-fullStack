import { ArrowRight, Building2, Landmark, type LucideIcon } from 'lucide-react'

import { WizardProgress } from './WizardProgress'
import { WizardStep } from './WizardStep'

export type Profile = 'me' | 'gestor'

const PROFILES: { id: Profile; icon: LucideIcon; title: string; text: string }[] = [
  {
    id: 'me',
    icon: Building2,
    title: 'Sou Fornecedor / Microempresa',
    text: 'Para microempresas (ME) que desejam vender para prefeituras e encontrar oportunidades em licitações.',
  },
  {
    id: 'gestor',
    icon: Landmark,
    title: 'Sou Gestor Público',
    text: 'Para prefeitos, secretários e servidores públicos municipais que desejam acompanhar dados e compras do município.',
  },
]

// Antes da escolha ainda não se sabe quais etapas vêm; a barra mostra as fases.
const OVERVIEW_STEPS = ['Perfil', 'Dados', 'Detalhes', 'Conclusão']

export const ProfileSelector = ({ onSelect }: { onSelect: (profile: Profile) => void }) => (
  <>
    <WizardProgress steps={OVERVIEW_STEPS} current={0} furthest={0} />

    <WizardStep
      title='Como você vai usar o portal?'
      hint='Escolha o seu perfil para ver o cadastro certo para você.'>
      <ul className='auth-profile-grid'>
        {PROFILES.map(({ id, icon: Icon, title, text }) => (
          <li key={id}>
            <button type='button' className='auth-profile-card' onClick={() => onSelect(id)}>
              <span className='auth-profile-icon' aria-hidden='true'>
                <Icon size={30} strokeWidth={1.75} />
              </span>
              <span className='auth-profile-title'>{title}</span>
              <span className='auth-profile-text'>{text}</span>
              <span className='auth-profile-cta' aria-hidden='true'>
                Começar
                <ArrowRight size={16} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </WizardStep>
  </>
)
