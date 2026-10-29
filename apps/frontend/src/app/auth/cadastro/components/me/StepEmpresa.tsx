import { ChevronDown, FileText } from 'lucide-react'

import { CnpjField } from '../CnpjField'
import { FieldError, fieldA11y } from '../FieldError'
import type { CnpjLookupState } from '../useCnpjLookup'
import type { FieldErrors } from '../useWizard'
import { PORTES, type MEData, type MEField, type Porte } from './form'

interface StepEmpresaProps {
  data: MEData
  errors: FieldErrors<MEField>
  lookup: CnpjLookupState
  onCnpjChange: (value: string) => void
  onChange: (patch: Partial<MEData>) => void
}

export const StepEmpresa = ({ data, errors, lookup, onCnpjChange, onChange }: StepEmpresaProps) => {
  const wrapClass = (error?: string) => `auth-input-wrap${error ? ' is-invalid' : ''}`

  return (
    <div className='auth-grid-2'>
      <CnpjField
        label='CNPJ da Empresa'
        value={data.cnpj}
        error={errors.cnpj}
        lookup={lookup}
        foundMessage={() => 'Razão social preenchida com os dados da Receita Federal.'}
        onChange={onCnpjChange}
      />

      <div className='auth-field auth-field-full'>
        <label htmlFor='nome_empresa'>Razão Social / Nome Fantasia</label>
        <div className={wrapClass(errors.nome_empresa)}>
          <input
            id='nome_empresa'
            name='nome_empresa'
            type='text'
            placeholder={
              lookup.status === 'loading' ? 'Buscando na Receita Federal…' : 'Nome da sua empresa'
            }
            maxLength={200}
            value={data.nome_empresa}
            onChange={(e) => onChange({ nome_empresa: e.target.value })}
            {...fieldA11y('nome_empresa', errors.nome_empresa)}
          />
          <FileText size={18} />
        </div>
        <FieldError field='nome_empresa' message={errors.nome_empresa} />
      </div>

      <div className='auth-field'>
        <label htmlFor='porte_empresa'>Porte da Empresa</label>
        <div className={`${wrapClass(errors.porte_empresa)} auth-select-wrap`}>
          <select
            id='porte_empresa'
            name='porte_empresa'
            className='auth-select'
            value={data.porte_empresa}
            onChange={(e) => onChange({ porte_empresa: e.target.value as Porte })}
            {...fieldA11y('porte_empresa', errors.porte_empresa)}>
            {PORTES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown size={18} />
        </div>
        <FieldError field='porte_empresa' message={errors.porte_empresa} />
      </div>

      {lookup.status === 'found' && lookup.data.atividadePrincipal && (
        <div className='auth-field auth-field-full'>
          <label>CNAE Principal identificado na Receita Federal</label>
          <div className='auth-input-wrap'>
            <input
              type='text'
              readOnly
              value={
                lookup.data.cnaePrincipal?.codigo
                  ? `${lookup.data.cnaePrincipal.codigo} — ${lookup.data.cnaePrincipal.descricao}`
                  : lookup.data.atividadePrincipal
              }
            />
            <FileText size={18} />
          </div>
          <small style={{ display: 'block', marginTop: 6, opacity: 0.78, fontSize: '0.8rem' }}>
            Usaremos o CNAE do seu CNPJ para encontrar licitações compatíveis automaticamente no seu painel (você poderá complementar depois nas configurações).
          </small>
        </div>
      )}
    </div>
  )
}
