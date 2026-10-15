import { ChevronDown, Landmark } from 'lucide-react'

import type { Municipality } from '@/services/municipalities/municipalities.types'
import { CnpjField } from '../CnpjField'
import { FieldError, fieldA11y } from '../FieldError'
import type { CnpjLookupState } from '../useCnpjLookup'
import type { FieldErrors } from '../useWizard'
import { MESSAGE_MAX_LENGTH, type GestorData, type GestorField } from './form'

interface StepOrgaoProps {
  data: GestorData
  errors: FieldErrors<GestorField>
  municipalities: Municipality[]
  municipalitiesError: boolean
  lookup: CnpjLookupState
  onCnpjChange: (value: string) => void
  onChange: (patch: Partial<GestorData>) => void
}

export const StepOrgao = ({
  data,
  errors,
  municipalities,
  municipalitiesError,
  lookup,
  onCnpjChange,
  onChange,
}: StepOrgaoProps) => {
  const wrapClass = (error?: string) => `auth-input-wrap${error ? ' is-invalid' : ''}`
  // Sem a lista não há como escolher; o aviso aparece no lugar do erro de "selecione".
  const municipioError =
    errors.municipioIbge ??
    (municipalitiesError
      ? 'Não conseguimos carregar a lista de municípios. Recarregue a página.'
      : undefined)

  return (
    <div className='auth-grid-2'>
      <div className='auth-field auth-field-full'>
        <label htmlFor='municipioIbge'>Município</label>
        <div className={`${wrapClass(municipioError)} auth-select-wrap`}>
          {/* required só para o estilo de "nada escolhido" (:invalid); quem valida é o Zod. */}
          <select
            id='municipioIbge'
            name='municipioIbge'
            className='auth-select'
            required
            value={data.municipioIbge}
            onChange={(e) => onChange({ municipioIbge: e.target.value })}
            {...fieldA11y('municipioIbge', municipioError)}>
            <option value='' disabled>
              {municipalitiesError ? 'Lista indisponível' : 'Selecione o município'}
            </option>
            {municipalities.map((municipality) => (
              <option key={municipality.id} value={municipality.id}>
                {municipality.nome}
              </option>
            ))}
          </select>
          <ChevronDown size={18} />
        </div>
        <FieldError field='municipioIbge' message={municipioError} />
      </div>

      <div className='auth-field auth-field-full'>
        <label htmlFor='orgao'>Órgão ou Prefeitura</label>
        <div className={wrapClass(errors.orgao)}>
          <input
            id='orgao'
            name='orgao'
            type='text'
            placeholder='Ex.: Secretaria de Educação de Sobral'
            maxLength={160}
            value={data.orgao}
            onChange={(e) => onChange({ orgao: e.target.value })}
            {...fieldA11y('orgao', errors.orgao)}
          />
          <Landmark size={18} />
        </div>
        <FieldError field='orgao' message={errors.orgao} />
      </div>

      <CnpjField
        label='CNPJ do Órgão'
        value={data.cnpj}
        error={errors.cnpj}
        lookup={lookup}
        foundMessage={(razaoSocial) => `Encontrado na Receita Federal: ${razaoSocial}.`}
        onChange={onCnpjChange}
      />

      <div className='auth-field auth-field-full'>
        <label htmlFor='message'>Qual o objetivo do acesso ao portal? (opcional)</label>
        <div className={wrapClass(errors.message)}>
          <textarea
            id='message'
            name='message'
            rows={3}
            maxLength={MESSAGE_MAX_LENGTH}
            placeholder='Ex.: acompanhar as compras da secretaria e comparar com outros municípios'
            value={data.message}
            onChange={(e) => onChange({ message: e.target.value })}
            {...(errors.message
              ? fieldA11y('message', errors.message)
              : { 'aria-describedby': 'message-contador' })}
          />
        </div>
        {errors.message ? (
          <FieldError field='message' message={errors.message} />
        ) : (
          <small id='message-contador' className='auth-hint'>
            {data.message.length}/{MESSAGE_MAX_LENGTH} caracteres
          </small>
        )}
      </div>
    </div>
  )
}
