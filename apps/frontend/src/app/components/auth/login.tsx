'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Eye, EyeOff, Loader2, Mail } from 'lucide-react'

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

export const Login = ({ next }: { next?: string }) => {
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setError(data?.message ?? 'Não foi possível entrar. Tente novamente.')
        setPending(false)
        return
      }

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
                <input type='checkbox' />
                Lembrar-me
              </label>
              <Link href='#' className='auth-forgot'>
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
          </form>

          <p className='auth-switch'>
            Sua empresa ainda não tem acesso?{' '}
            <Link href='/auth/solicitar-acesso'>Solicitar acesso</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
