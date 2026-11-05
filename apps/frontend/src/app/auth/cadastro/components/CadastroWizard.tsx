'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ChevronLeft } from 'lucide-react'

import { BrandLogo } from '@/components/brand/BrandLogo'
import { GESTOR_INITIAL_DATA, type GestorData } from './gestor/form'
import { GestorFlow } from './gestor/GestorFlow'
import { ME_INITIAL_DATA, type MEData } from './me/form'
import { MEFlow } from './me/MEFlow'
import { ProfileSelector, type Profile } from './ProfileSelector'
import { PROGRESS_ID, STEP_TITLE_ID } from './useWizard'

const HEADERS: Record<Profile | 'escolha', { title: string; subtitle: string }> = {
  escolha: {
    title: 'Crie sua conta',
    subtitle: 'Escolha o seu perfil e siga o passo a passo. Leva poucos minutos.',
  },
  me: {
    title: 'Cadastre sua Empresa',
    subtitle: 'Preencha os dados da sua empresa e envie os comprovantes para liberação de acesso.',
  },
  gestor: {
    title: 'Acesso para Gestor Público',
    subtitle:
      'Preencha seus dados. A conta fica pronta na hora.',
  },
}

const RegisterIllustration = () => (
  <svg
    className='auth-icon'
    viewBox='0 0 140 140'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    role='img'
    aria-label='Ícone de cadastro'>
    <rect
      x='20'
      y='20'
      width='100'
      height='100'
      rx='16'
      fill='#11169b'
      fillOpacity='0.18'
      stroke='#6ce3f8'
      strokeWidth='6'
    />
    <rect x='36' y='36' width='68' height='12' rx='6' fill='#d9a441' />
    <rect x='36' y='56' width='44' height='8' rx='4' fill='#6ce3f8' />
    <rect x='36' y='70' width='68' height='8' rx='4' fill='#6ce3f8' fillOpacity='0.6' />
    <rect x='36' y='84' width='52' height='8' rx='4' fill='#6ce3f8' fillOpacity='0.4' />
    <circle cx='102' cy='102' r='20' fill='#11169b' stroke='#6ce3f8' strokeWidth='4' />
    <path
      d='M94 102l5 5 10-10'
      stroke='#ffffff'
      strokeWidth='4'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

interface CadastroWizardProps {
  initialProfile: Profile | null
}

export const CadastroWizard = ({ initialProfile }: CadastroWizardProps) => {
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  // Os dados dos dois fluxos ficam aqui: trocar de perfil (ou voltar para a
  // escolha) não apaga o que já foi preenchido, inclusive os arquivos.
  const [meData, setMeData] = useState<MEData>(ME_INITIAL_DATA)
  const [gestorData, setGestorData] = useState<GestorData>(GESTOR_INITIAL_DATA)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const focusTitle = useRef(false)

  // Ao trocar de tela (escolha <-> fluxo), o foco vai para o título da etapa.
  useEffect(() => {
    if (!focusTitle.current) return
    focusTitle.current = false
    document.getElementById(STEP_TITLE_ID)?.focus({ preventScroll: true })
    document.getElementById(PROGRESS_ID)?.scrollIntoView({ block: 'nearest' })
  }, [profile])

  function changeProfile(next: Profile | null) {
    focusTitle.current = true
    setProfile(next)
    // Mantém o perfil na URL (recarregar ou compartilhar o link abre no mesmo
    // fluxo) sem criar uma entrada nova no histórico.
    window.history.replaceState(null, '', next ? `/auth/cadastro?perfil=${next}` : '/auth/cadastro')
  }

  const header = HEADERS[profile ?? 'escolha']

  return (
    <div className='auth-page'>
      <div className='auth-shell auth-shell-wide'>
        <div className='auth-visual'>
          <div className='auth-icon-wrap'>
            <RegisterIllustration />
          </div>
          <BrandLogo inverse />
        </div>

        <div className='auth-panel'>
          {sentTo ? (
            <AccountCreated email={sentTo} />
          ) : (
            <>
              <Link href='/auth/login' className='auth-back'>
                <ChevronLeft size={18} />
                Voltar para o Login
              </Link>

              <h1>{header.title}</h1>
              <p className='auth-subtitle'>{header.subtitle}</p>

              {profile === null && <ProfileSelector onSelect={changeProfile} />}
              {profile === 'me' && (
                <MEFlow data={meData} setData={setMeData} onExit={() => changeProfile(null)} />
              )}
              {profile === 'gestor' && (
                <GestorFlow
                  data={gestorData}
                  setData={setGestorData}
                  onExit={() => changeProfile(null)}
                  onSent={setSentTo}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Fim do fluxo do Gestor: a conta já nasce liberada, sem análise. (A ME vai
// direto para o login com o aviso de análise.)
const AccountCreated = ({ email }: { email: string }) => (
  <div className='auth-result auth-step-enter'>
    <span className='auth-result-icon is-success'>
      <CheckCircle2 size={28} />
    </span>
    <h1>Conta criada!</h1>
    <p>
      Sua conta de gestor público já está pronta. Entre com <b>{email}</b> e a senha
      cadastrada para acessar o painel da sua prefeitura.
    </p>
    <Link href='/auth/login' className='button button-primary auth-submit'>
      Entrar no painel
    </Link>
  </div>
)
