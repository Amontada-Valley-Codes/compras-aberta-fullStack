'use client'

import { useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react'

import { BrandLogo } from '@/components/brand/BrandLogo'
import { formatCnpj, formatPhone, onlyDigits } from '@/lib/format-br'
import type { CnpjLookup } from '@/services/access-requests/access-requests.types'
import type { Municipality } from '@/services/municipalities/municipalities.types'
import { AuthIllustration } from './auth-illustration'

// O backend responde 400 com issues.fieldErrors quando algum campo não passa
// na validação; mostramos a primeira mensagem, que já vem em pt-BR.
function firstFieldError(data: unknown): string | null {
  const fieldErrors = (data as { issues?: { fieldErrors?: Record<string, string[]> } })?.issues
    ?.fieldErrors
  const first = fieldErrors && Object.values(fieldErrors).flat()[0]
  return first ?? null
}

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; data: CnpjLookup }
  | { status: 'error'; message: string }

type AccessRequestProps = {
  municipalities: Municipality[]
  municipalitiesError: boolean
}

export const AccessRequest = ({ municipalities, municipalitiesError }: AccessRequestProps) => {
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [cnpj, setCnpj] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [municipioIbge, setMunicipioIbge] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [lookup, setLookup] = useState<LookupState>({ status: 'idle' })
  // CNPJ da consulta mais recente: se a pessoa mudar o CNPJ enquanto uma
  // consulta anterior ainda responde, a resposta antiga é descartada.
  const lastLookup = useRef('')

  // Busca os dados na base da Receita (via backend) e preenche o formulário.
  // Razão social e município vêm da Receita; telefone e e-mail só entram se
  // a pessoa ainda não tiver digitado os seus.
  async function lookupCnpj(digits: string) {
    lastLookup.current = digits
    setLookup({ status: 'loading' })

    try {
      const response = await fetch(`/api/cnpj/${digits}`)
      const data = await response.json().catch(() => null)
      if (lastLookup.current !== digits) return

      if (!response.ok) {
        setLookup({
          status: 'error',
          message:
            firstFieldError(data) ??
            data?.message ??
            'Não foi possível consultar o CNPJ agora. Preencha os dados manualmente.',
        })
        return
      }

      const company = data as CnpjLookup
      setLookup({ status: 'found', data: company })
      setCompanyName(company.razaoSocial)
      if (company.municipio.codigoIbge) setMunicipioIbge(String(company.municipio.codigoIbge))
      if (company.telefone) setPhone((current) => current || formatPhone(company.telefone!))
      if (company.email) setEmail((current) => current || company.email!)
    } catch {
      if (lastLookup.current !== digits) return
      setLookup({
        status: 'error',
        message: 'Não foi possível consultar o CNPJ agora. Preencha os dados manualmente.',
      })
    }
  }

  function handleCnpjChange(value: string) {
    const formatted = formatCnpj(value)
    const digits = onlyDigits(formatted)
    setCnpj(formatted)

    if (digits.length === 14) {
      if (digits !== lastLookup.current) void lookupCnpj(digits)
    } else if (lastLookup.current) {
      lastLookup.current = ''
      setLookup({ status: 'idle' })
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const formData = new FormData(event.currentTarget)
    const field = (name: string) => String(formData.get(name) ?? '').trim()
    const password = String(formData.get('password') ?? '')

    if (password !== String(formData.get('passwordConfirmation') ?? '')) {
      setError('As senhas não conferem.')
      return
    }

    setPending(true)

    try {
      const response = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          cnpj,
          municipioIbge: Number(municipioIbge),
          phone,
          name: field('name'),
          email: email.trim(),
          password,
          message: field('message') || undefined,
        }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setError(
          firstFieldError(data) ??
            data?.message ??
            'Não foi possível enviar a solicitação. Tente novamente.',
        )
        setPending(false)
        return
      }

      setSentTo(email.trim())
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
          <Link href={sentTo ? '/' : '/auth/login'} className='auth-back'>
            <ChevronLeft size={18} />
            Voltar
          </Link>

          {sentTo ? (
            <div className='auth-result'>
              <span className='auth-result-icon is-success'>
                <CheckCircle2 size={28} />
              </span>
              <h1>Solicitação enviada!</h1>
              <p>
                Nossa equipe vai analisar os dados da sua empresa. Enquanto isso, você já pode
                entrar com <b>{sentTo}</b> para acompanhar a situação da solicitação.
              </p>
              <Link href='/auth/login' className='button button-primary auth-submit'>
                Entrar para acompanhar
              </Link>
            </div>
          ) : (
            <>
              <h1>Solicite o acesso da sua empresa</h1>
              <p className='auth-lead'>
                Preencha os dados abaixo. Depois da aprovação, você acessa as oportunidades
                compatíveis com o seu negócio.
              </p>

              <form className='auth-form' onSubmit={handleSubmit}>
                <fieldset className='auth-fieldset'>
                  <legend>Dados da empresa</legend>

                  <div className='auth-field'>
                    <label htmlFor='cnpj'>CNPJ</label>
                    <div className='auth-input-wrap'>
                      <input
                        id='cnpj'
                        name='cnpj'
                        inputMode='numeric'
                        placeholder='00.000.000/0000-00'
                        value={cnpj}
                        onChange={(event) => handleCnpjChange(event.target.value)}
                        aria-describedby='cnpj-lookup'
                        required
                      />
                      {lookup.status === 'loading' ? (
                        <Loader2 className='auth-submit-spinner' size={18} />
                      ) : lookup.status === 'found' ? (
                        <CheckCircle2 size={18} className='auth-lookup-ok' />
                      ) : (
                        <FileText size={18} />
                      )}
                    </div>
                    <CnpjLookupStatus lookup={lookup} />
                  </div>

                  <div className='auth-field'>
                    <label htmlFor='companyName'>Razão social</label>
                    <div className='auth-input-wrap'>
                      <input
                        id='companyName'
                        name='companyName'
                        value={companyName}
                        onChange={(event) => setCompanyName(event.target.value)}
                        required
                        minLength={3}
                        maxLength={160}
                      />
                      <Building2 size={18} />
                    </div>
                  </div>

                  <div className='auth-field'>
                    <label htmlFor='municipioIbge'>Município</label>
                    <div className='auth-input-wrap'>
                      <select
                        id='municipioIbge'
                        name='municipioIbge'
                        value={municipioIbge}
                        onChange={(event) => setMunicipioIbge(event.target.value)}
                        required>
                        <option value='' disabled>
                          {municipalitiesError ? 'Não foi possível carregar' : 'Selecione'}
                        </option>
                        {municipalities.map((municipality) => (
                          <option key={municipality.id} value={municipality.id}>
                            {municipality.nome}
                          </option>
                        ))}
                      </select>
                      <MapPin size={18} />
                    </div>
                  </div>
                </fieldset>

                <fieldset className='auth-fieldset'>
                  <legend>Responsável pelo acesso</legend>

                  <div className='auth-field'>
                    <label htmlFor='name'>Nome completo</label>
                    <div className='auth-input-wrap'>
                      <input id='name' name='name' autoComplete='name' required minLength={3} maxLength={120} />
                      <User size={18} />
                    </div>
                  </div>

                  <div className='auth-grid'>
                    <div className='auth-field'>
                      <label htmlFor='email'>E-mail</label>
                      <div className='auth-input-wrap'>
                        <input
                          id='email'
                          name='email'
                          type='email'
                          autoComplete='email'
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          required
                        />
                        <Mail size={18} />
                      </div>
                    </div>

                    <div className='auth-field'>
                      <label htmlFor='phone'>Telefone</label>
                      <div className='auth-input-wrap'>
                        <input
                          id='phone'
                          name='phone'
                          type='tel'
                          autoComplete='tel'
                          placeholder='(00) 00000-0000'
                          value={phone}
                          onChange={(event) => setPhone(formatPhone(event.target.value))}
                          required
                        />
                        <Phone size={18} />
                      </div>
                    </div>
                  </div>

                  <div className='auth-grid'>
                    <div className='auth-field'>
                      <label htmlFor='password'>Senha</label>
                      <div className='auth-input-wrap'>
                        <input
                          id='password'
                          name='password'
                          type={showPassword ? 'text' : 'password'}
                          autoComplete='new-password'
                          required
                          minLength={6}
                        />
                        <button
                          type='button'
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                          {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className='auth-field'>
                      <label htmlFor='passwordConfirmation'>Confirmar senha</label>
                      <div className='auth-input-wrap'>
                        <input
                          id='passwordConfirmation'
                          name='passwordConfirmation'
                          type={showPassword ? 'text' : 'password'}
                          autoComplete='new-password'
                          required
                          minLength={6}
                        />
                      </div>
                    </div>
                  </div>

                  <div className='auth-field'>
                    <label htmlFor='message'>Observação (opcional)</label>
                    <div className='auth-input-wrap'>
                      <textarea
                        id='message'
                        name='message'
                        rows={2}
                        maxLength={500}
                        placeholder='Conte algo que ajude nossa equipe na análise'
                      />
                    </div>
                  </div>
                </fieldset>

                {error && (
                  <p className='auth-error' role='alert'>
                    {error}
                  </p>
                )}

                <button
                  type='submit'
                  className='button button-primary auth-submit'
                  disabled={pending}>
                  {pending && <Loader2 className='auth-submit-spinner' size={18} />}
                  {pending ? 'Enviando…' : 'Enviar solicitação'}
                </button>
              </form>

              <p className='auth-switch'>
                Já tem acesso? <Link href='/auth/login'>Entrar</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CnpjLookupStatus({ lookup }: { lookup: LookupState }) {
  if (lookup.status === 'idle') {
    return (
      <small id='cnpj-lookup' className='auth-hint'>
        Ao informar o CNPJ, buscamos os dados da empresa na Receita Federal.
      </small>
    )
  }

  if (lookup.status === 'loading') {
    return (
      <small id='cnpj-lookup' className='auth-hint' role='status'>
        Consultando o CNPJ na Receita Federal…
      </small>
    )
  }

  if (lookup.status === 'error') {
    return (
      <small id='cnpj-lookup' className='auth-hint is-warning' role='status'>
        {lookup.message}
      </small>
    )
  }

  const { data } = lookup
  const isActive = data.situacaoCadastral.toLowerCase() === 'ativa'

  return (
    <div id='cnpj-lookup' className='auth-lookup' role='status'>
      <b>Dados encontrados na Receita Federal</b>
      <dl>
        {data.nomeFantasia && (
          <div>
            <dt>Nome fantasia</dt>
            <dd>{data.nomeFantasia}</dd>
          </div>
        )}
        <div>
          <dt>Situação cadastral</dt>
          <dd className={isActive ? 'is-active' : 'is-inactive'}>{data.situacaoCadastral}</dd>
        </div>
        {data.porte && (
          <div>
            <dt>Porte</dt>
            <dd>{data.porte}</dd>
          </div>
        )}
        {data.atividadePrincipal && (
          <div>
            <dt>Atividade principal</dt>
            <dd>{data.atividadePrincipal}</dd>
          </div>
        )}
      </dl>
      {!isActive && (
        <p className='is-warning'>
          <AlertTriangle size={14} /> A empresa não está ativa na Receita. A solicitação pode ser
          recusada na análise.
        </p>
      )}
      {!data.municipio.codigoIbge && (
        <p className='is-warning'>
          <AlertTriangle size={14} />
          {`O endereço na Receita é ${data.municipio.nome}/${data.municipio.uf}, que não está na lista. Selecione o município manualmente.`}
        </p>
      )}
    </div>
  )
}
