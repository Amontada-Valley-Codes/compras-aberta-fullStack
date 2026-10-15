import { AlertTriangle, Building2, CheckCircle2, Loader2 } from 'lucide-react'

import { FieldError, fieldA11y } from './FieldError'
import type { CnpjLookupState } from './useCnpjLookup'

interface CnpjFieldProps {
  label: string
  value: string
  error?: string
  lookup: CnpjLookupState
  // O que foi preenchido com a consulta, ex.: "Razão social preenchida…".
  foundMessage: (razaoSocial: string) => string
  onChange: (value: string) => void
}

// Campo de CNPJ com máscara e consulta à Receita: ícone de carregando/ok e,
// embaixo, o erro de validação ou o resultado da consulta.
export const CnpjField = ({ label, value, error, lookup, foundMessage, onChange }: CnpjFieldProps) => (
  <div className='auth-field auth-field-full'>
    <label htmlFor='cnpj'>{label}</label>
    <div className={`auth-input-wrap${error ? ' is-invalid' : ''}`}>
      <input
        id='cnpj'
        name='cnpj'
        type='text'
        inputMode='numeric'
        placeholder='00.000.000/0000-00'
        maxLength={18}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...(error
          ? fieldA11y('cnpj', error)
          : lookup.status !== 'idle'
            ? { 'aria-describedby': 'cnpj-lookup' }
            : {})}
      />
      {lookup.status === 'loading' ? (
        <Loader2 className='auth-submit-spinner' size={18} aria-label='Consultando CNPJ' />
      ) : lookup.status === 'found' && !error ? (
        <CheckCircle2 size={18} className='auth-lookup-ok' />
      ) : (
        <Building2 size={18} />
      )}
    </div>
    {error ? (
      <FieldError field='cnpj' message={error} />
    ) : (
      <CnpjLookupHint lookup={lookup} foundMessage={foundMessage} />
    )}
  </div>
)

// Enquanto a pessoa digita não mostramos nada: a dica da etapa já explica a busca.
function CnpjLookupHint({
  lookup,
  foundMessage,
}: {
  lookup: CnpjLookupState
  foundMessage: CnpjFieldProps['foundMessage']
}) {
  if (lookup.status === 'idle') return null

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

  const { razaoSocial, situacaoCadastral } = lookup.data
  const isActive = situacaoCadastral.toLowerCase() === 'ativa'

  return (
    <small id='cnpj-lookup' className='auth-hint' role='status'>
      {foundMessage(razaoSocial)}
      {!isActive && (
        <span className='auth-hint-warning'>
          <AlertTriangle size={13} aria-hidden='true' />
          Situação cadastral: {situacaoCadastral}. A solicitação pode ser recusada na análise.
        </span>
      )}
    </small>
  )
}
