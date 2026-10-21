'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Clock3, Loader2, LogOut, RefreshCw, XCircle } from 'lucide-react'

import { BrandLogo } from '@/components/brand/BrandLogo'
import { toast } from '@/components/ui/sonner'
import { formatCnpj, formatDateTime } from '@/lib/format-br'
import type { AccessRequest, AccessStatus as Status } from '@/services/access-requests/access-requests.types'
import { AuthIllustration } from './auth-illustration'

const content: Record<Status, { icon: ReactNode; tone: string; title: string; text: string }> = {
  PENDING: {
    icon: <Clock3 size={28} />,
    tone: 'is-pending',
    title: 'Sua solicitação está em análise',
    text: 'Nossa equipe está conferindo os dados da sua empresa. Assim que o acesso for aprovado, a área da empresa é liberada para você.',
  },
  APPROVED: {
    icon: <CheckCircle2 size={28} />,
    tone: 'is-success',
    title: 'Acesso aprovado!',
    text: 'Sua solicitação foi aprovada. Clique abaixo para entrar na área da sua empresa.',
  },
  REJECTED: {
    icon: <XCircle size={28} />,
    tone: 'is-danger',
    title: 'Solicitação não aprovada',
    text: 'Sua solicitação de acesso foi analisada e não foi aprovada. Veja o motivo abaixo e, em caso de dúvida, fale com o nosso suporte.',
  },
}

export const AccessStatus = ({ accessRequest }: { accessRequest: AccessRequest | null }) => {
  const [checking, setChecking] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()

  // O token guarda a situação do momento do login. Renovar a sessão emite um
  // token novo com a situação atual; se já foi aprovada, o "home" muda para
  // a área da empresa.
  async function checkAgain() {
    setChecking(true)

    try {
      const response = await fetch('/api/auth/refresh', { method: 'POST' })
      const data = await response.json().catch(() => null)

      if (response.status === 401 || response.status === 403) {
        router.push('/auth/login')
        return
      }

      if (response.ok && data?.accessStatus === 'APPROVED') {
        toast.success('Acesso liberado!', {
          description: 'Bem-vindo(a) à área da sua empresa.',
        })
        router.push(data.home ?? '/me')
        return
      }

      if (response.ok && data?.accessStatus === 'PENDING') {
        toast.info('Ainda em análise', {
          description: 'Avisaremos assim que houver uma decisão.',
        })
      }

      router.refresh()
    } catch {
      toast.error('Não foi possível verificar agora', {
        description: 'Verifique sua conexão e tente novamente.',
      })
    }

    setChecking(false)
  }

  async function logout() {
    setLoggingOut(true)

    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error(`Logout falhou (${response.status})`)
    } catch {
      toast.error('Não foi possível sair', {
        description: 'Verifique sua conexão e tente novamente.',
      })
      setLoggingOut(false)
      return
    }

    router.push('/auth/login')
  }

  const view = accessRequest ? content[accessRequest.status] : null

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
          <div className='auth-result'>
            {accessRequest && view ? (
              <>
                <span className={`auth-result-icon ${view.tone}`}>{view.icon}</span>
                <small className='auth-eyebrow'>STATUS DO ACESSO</small>
                <h1>{view.title}</h1>
                <p>{view.text}</p>

                {accessRequest.status === 'REJECTED' && accessRequest.reviewNote && (
                  <div className='auth-note'>
                    <b>Motivo informado pela equipe</b>
                    <p>{accessRequest.reviewNote}</p>
                  </div>
                )}

                <dl className='auth-summary'>
                  <div>
                    <dt>Empresa</dt>
                    <dd>{accessRequest.companyName}</dd>
                  </div>
                  <div>
                    <dt>CNPJ</dt>
                    <dd>{formatCnpj(accessRequest.cnpj)}</dd>
                  </div>
                  <div>
                    <dt>Município</dt>
                    <dd>{accessRequest.municipio.nome ?? '—'}/CE</dd>
                  </div>
                  <div>
                    <dt>Enviada em</dt>
                    <dd>{formatDateTime(accessRequest.createdAt)}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <>
                <span className='auth-result-icon is-danger'>
                  <AlertCircle size={28} />
                </span>
                <h1>Não foi possível carregar sua solicitação</h1>
                <p>Tente novamente em instantes. Se o problema continuar, saia e entre de novo.</p>
              </>
            )}

            <div className='auth-actions'>
              {accessRequest?.status !== 'REJECTED' && (
                <button
                  type='button'
                  className='button button-primary auth-submit'
                  onClick={checkAgain}
                  disabled={checking}>
                  {checking ? (
                    <Loader2 className='auth-submit-spinner' size={18} />
                  ) : (
                    <RefreshCw size={18} />
                  )}
                  {accessRequest?.status === 'APPROVED' ? 'Acessar área da empresa' : 'Verificar novamente'}
                </button>
              )}
              <button
                type='button'
                className='auth-secondary'
                onClick={logout}
                disabled={loggingOut}>
                <LogOut size={18} />
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
