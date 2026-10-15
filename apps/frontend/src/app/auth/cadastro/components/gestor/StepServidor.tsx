import { Mail, Phone, User } from 'lucide-react'

import { formatPhone } from '@/lib/format-br'
import { FieldError, fieldA11y } from '../FieldError'
import { PasswordFields } from '../PasswordFields'
import type { FieldErrors } from '../useWizard'
import type { GestorData, GestorField } from './form'

interface StepServidorProps {
  data: GestorData
  errors: FieldErrors<GestorField>
  onChange: (patch: Partial<GestorData>) => void
}

export const StepServidor = ({ data, errors, onChange }: StepServidorProps) => {
  const wrapClass = (error?: string) => `auth-input-wrap${error ? ' is-invalid' : ''}`

  return (
    <div className='auth-grid-2'>
      <div className='auth-field auth-field-full'>
        <label htmlFor='name'>Nome Completo</label>
        <div className={wrapClass(errors.name)}>
          <input
            id='name'
            name='name'
            type='text'
            placeholder='Seu nome completo'
            autoComplete='name'
            maxLength={120}
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            {...fieldA11y('name', errors.name)}
          />
          <User size={18} />
        </div>
        <FieldError field='name' message={errors.name} />
      </div>

      <div className='auth-field'>
        <label htmlFor='email'>E-mail Institucional</label>
        <div className={wrapClass(errors.email)}>
          <input
            id='email'
            name='email'
            type='email'
            placeholder='nome@municipio.ce.gov.br'
            autoComplete='email'
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            {...fieldA11y('email', errors.email)}
          />
          <Mail size={18} />
        </div>
        <FieldError field='email' message={errors.email} />
      </div>

      <div className='auth-field'>
        <label htmlFor='phone'>Telefone / Celular</label>
        <div className={wrapClass(errors.phone)}>
          <input
            id='phone'
            name='phone'
            type='tel'
            inputMode='tel'
            placeholder='(00) 00000-0000'
            autoComplete='tel'
            value={data.phone}
            onChange={(e) => onChange({ phone: formatPhone(e.target.value) })}
            {...fieldA11y('phone', errors.phone)}
          />
          <Phone size={18} />
        </div>
        <FieldError field='phone' message={errors.phone} />
      </div>

      <PasswordFields
        password={data.password}
        passwordConfirmation={data.passwordConfirmation}
        errors={errors}
        onChange={onChange}
      />
    </div>
  )
}
