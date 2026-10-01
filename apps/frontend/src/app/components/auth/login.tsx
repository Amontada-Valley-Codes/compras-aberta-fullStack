'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Eye, EyeOff, Loader2, Mail } from 'lucide-react'

import { BrandLogo } from '@/components/brand/BrandLogo'
import { toast } from '@/components/ui/sonner'

const LoginIllustration = () => (
  <svg
    className='auth-icon'
    viewBox='0 0 140 140'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    role='img'
    aria-label='Ícone de cadastro verificado'>
    <rect
      x='26'
      y='26'
      width='80'
      height='94'
      rx='16'
      fill='#2563a6'
      fillOpacity='0.18'
      stroke='#eaf3f8'
      strokeWidth='6'
    />
    <rect x='59' y='10' width='14' height='12' rx='6' fill='#eaf3f8' />
    <rect x='51' y='16' width='30' height='16' rx='8' fill='#eaf3f8' />
    <rect x='38' y='48' width='56' height='58' rx='10' fill='#123b5d' fillOpacity='0.4' />
    <circle cx='66' cy='68' r='14' fill='#4f9fee' />
    <rect x='46' y='90' width='40' height='6' rx='3' fill='#eaf3f8' />
    <rect x='46' y='100' width='26' height='6' rx='3' fill='#eaf3f8' fillOpacity='0.55' />
    <circle cx='96' cy='112' r='18' fill='#d9a441' />
    <path
      d='M88 112 l6 6 12-13'
      stroke='#123b5d'
      strokeWidth='6'
      strokeLinecap='round'
      strokeLinejoin='round'
      fill='none'
    />
  </svg>
)

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
            <LoginIllustration />
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
        </div>
      </div>
    </div>
  )
}
