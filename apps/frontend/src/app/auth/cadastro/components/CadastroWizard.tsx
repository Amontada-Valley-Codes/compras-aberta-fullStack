'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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

interface CadastroWizardProps {
  initialProfile: Profile | null
  /** Veio da página inicial: o "Voltar" leva de volta ao início, não ao login. */
  fromHome?: boolean
}

export const CadastroWizard = ({ initialProfile, fromHome = false }: CadastroWizardProps) => {
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
    // A origem também é mantida, para o "Voltar" continuar certo após recarregar.
    const params = new URLSearchParams()
    if (next) params.set('perfil', next)
    if (fromHome) params.set('origem', 'inicio')
    const query = params.toString()
    window.history.replaceState(null, '', query ? `/auth/cadastro?${query}` : '/auth/cadastro')
  }

  const header = HEADERS[profile ?? 'escolha']

  return (
    <div className='auth-page auth-register'>
      <div className='auth-shell auth-shell-wide'>
        <div className='auth-visual'>
          <div className='auth-register-photo'>
            <Image src='/images/register-entrepreneur-transparent.png' alt='Profissional loira segurando um tablet' fill sizes='(min-width: 1280px) 480px, (min-width: 1024px) 40vw, 1px' preload />
          </div>
          <div className='auth-register-brand'><BrandLogo inverse /></div>
        </div>

        <div className='auth-panel'>
          {sentTo ? (
            <AccountCreated email={sentTo} />
          ) : (
            <>
              <Link href={fromHome ? '/' : '/auth/login'} className='auth-back'>
                <ChevronLeft size={18} />
                {fromHome ? 'Voltar' : 'Voltar para o Login'}
              </Link>

              <h1>{header.title}</h1>
              <p className='auth-subtitle'>{header.subtitle}</p>

              {profile === null && <ProfileSelector onSelect={changeProfile} />}
              {profile === 'me' && (
                <MEFlow
                  data={meData}
                  setData={setMeData}
                  onExit={() => changeProfile(null)}
                  onSent={setSentTo}
                />
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

const AccountCreated = ({ email }: { email: string }) => (
  <div className='auth-result auth-step-enter'>
    <span className='auth-result-icon is-success'>
      <CheckCircle2 size={32} />
    </span>
    <h1>Conta criada com sucesso!</h1>
    
    <div style={{
      margin: '16px 0',
      padding: '16px',
      borderRadius: '12px',
      backgroundColor: 'rgba(217, 164, 65, 0.12)',
      border: '1px solid rgba(217, 164, 65, 0.3)',
      textAlign: 'left'
    }}>
      <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#d9a441' }}>
        🎁 7 Dias de Acesso Gratuito Liberado!
      </h3>
      <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', opacity: 0.9 }}>
        Você já pode explorar todas as oportunidades, radar de editais e ferramentas do sistema. Não é necessário cadastrar cartão para começar a testar.
      </p>
    </div>

    <p>
      Acesse com o e-mail <b>{email}</b> e a senha cadastrada para entrar no seu painel.
    </p>
    <Link href='/auth/login?status=trial_started' className='button button-primary auth-submit'>
      Fazer login e começar teste grátis
    </Link>
  </div>
)
