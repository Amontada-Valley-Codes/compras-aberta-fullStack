'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, ChevronLeft, Clock3, Eye, EyeOff, Loader2, Mail } from 'lucide-react'

import { BrandLogo } from '@/components/brand/BrandLogo'
import { toast } from '@/components/ui/sonner'
import { AuthIllustration } from './auth-illustration'

// Só aceita um destino relativo dentro do próprio site (nunca "//host" ou
// "/\host", que o navegador trata como um redirecionamento para outro
// domínio) — o "next" vem da URL, então nunca é confiável por si só.
function safeNextPath(value?: string): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return null
  }
  return value
}

// Com "Lembrar-me", o e-mail fica salvo só neste navegador para preencher o
// próximo login. A senha nunca é guardada.
const REMEMBERED_EMAIL_KEY = 'compras-abertas:login-email'

function readRememberedEmail(): string {
  try {
    return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

function saveRememberedEmail(email: string | null) {
  try {
    if (email) window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email)
    else window.localStorage.removeItem(REMEMBERED_EMAIL_KEY)
  } catch {
    // Armazenamento bloqueado (modo privado etc.): o login segue normalmente.
  }
}

export const Login = ({ next }: { next?: string }) => {
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [remember, setRemember] = useState(false)
  const router = useRouter()

  // Lido depois da montagem para o HTML do servidor e do cliente baterem.
  useEffect(() => {
    const saved = readRememberedEmail()
    if (!saved) return
    setEmail(saved)
    setRemember(true)
  }, [])
  const searchParams = useSearchParams()
  const statusParam = searchParams.get('status')
  const isPendingRegistration = statusParam === 'pending'
  const isCanceledSubscription = statusParam === 'canceled'
  const isExpiredSubscription = statusParam === 'expired'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const formData = new FormData(event.currentTarget)
    const password = String(formData.get('password') ?? '')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setError(data?.message ?? 'Não foi possível entrar. Tente novamente.')
        setPending(false)
        return
      }

      saveRememberedEmail(remember ? email.trim() : null)

      // Empresa ainda sem aprovação vai direto para o status da solicitação,
      // ignorando o "next" (o proxy.ts a devolveria para lá de todo jeito).
      if (data?.accessStatus && data.accessStatus !== 'APPROVED') {
        toast.info('Acompanhe sua solicitação', {
          description:
            data.accessStatus === 'PENDING'
              ? 'Seu acesso ainda está em análise pela nossa equipe.'
              : 'Sua solicitação de acesso não foi aprovada.',
        })
        router.push(data.home ?? '/')
        return
      }

      // O Toaster fica no layout raiz, então o toast continua na tela depois
      // do redirecionamento para o painel.
      toast.success('Bem-vindo(a) de volta!', {
        description:
          data?.role === 'ADMIN'
            ? 'Você entrou no painel de administração.'
            : data?.role === 'MANAGER'
              ? 'Você entrou no painel do gestor.'
              : 'Você entrou no painel da sua empresa.',
      })
      router.push(safeNextPath(next) ?? data?.home ?? '/')
    } catch {
      setError('Não foi possível conectar ao servidor. Verifique sua conexão.')
      setPending(false)
    }
  }

  return (
    <div className='auth-page'>
      <div className='auth-shell'>
        <div className='auth-visual'>
          <div className='auth-icon-wrap'>
            <AuthIllustration />
          </div>
          <BrandLogo inverse />
        </div>

        <div className='auth-panel'>
          <Link href='/' className='auth-back'>
            <ChevronLeft size={18} />
            Voltar
          </Link>

          <h1>Faça login na nossa plataforma</h1>

          {isPendingRegistration && (
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1e40af',
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: 'var(--text-sm)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                lineHeight: 'var(--leading-normal)',
              }}
            >
              <Clock3 size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#2563eb' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '2px', fontWeight: 600 }}>
                  Solicitação Cadastral em Análise
                </strong>
                Seus dados e documentos foram enviados. Aguarde a validação do administrador para que seu acesso seja liberado.
              </div>
            </div>
          )}

          {(isCanceledSubscription || isExpiredSubscription) && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: 'var(--text-sm)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                lineHeight: 'var(--leading-normal)',
              }}
            >
              <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#dc2626' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '2px', fontWeight: 600 }}>
                  {isCanceledSubscription
                    ? 'Assinatura Cancelada — Acesso Bloqueado'
                    : 'Período de Avaliação Expirado — Acesso Bloqueado'}
                </strong>
                {isCanceledSubscription
                  ? 'Sua assinatura foi cancelada e o acesso às funcionalidades da plataforma foi bloqueado. Seus dados cadastrais e histórico permanecem salvos com segurança.'
                  : 'Seus 7 dias de avaliação gratuita chegaram ao fim e o acesso ao painel foi bloqueado. Seus dados permanecem preservados na plataforma.'}
              </div>
            </div>
          )}

          <form className='auth-form' onSubmit={handleSubmit}>
            <div className='auth-field'>
              <label htmlFor='email'>E-mail</label>
              <div className='auth-input-wrap'>
                <input
                  id='email'
                  name='email'
                  type='email'
                  autoComplete='email'
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <Mail size={18} />
              </div>
            </div>

            <div className='auth-field'>
              <label htmlFor='password'>Senha</label>
              <div className='auth-input-wrap'>
                <input
                  id='password'
                  name='password'
                  type={showPassword ? 'text' : 'password'}
                  autoComplete='current-password'
                  required
                />
                <button
                  type='button'
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className='auth-error' role='alert'>
                {error}
              </p>
            )}

            <div className='auth-row'>
              <label className='auth-remember'>
                <input
                  type='checkbox'
                  name='remember'
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                Lembrar-me
              </label>
              <Link href='/contato#acesso' className='auth-forgot'>
                Esqueceu a senha?
              </Link>
            </div>

            <button
              type='submit'
              className='button button-primary auth-submit'
              disabled={pending}>
              {pending && <Loader2 className='auth-submit-spinner' size={18} />}
              {pending ? 'Entrando…' : 'Entrar'}
            </button>

            <div className='auth-register-prompt'>
              <span>Não possui cadastro? </span>
              <Link href='/auth/cadastro' className='auth-register-link'>
                Criar conta
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
