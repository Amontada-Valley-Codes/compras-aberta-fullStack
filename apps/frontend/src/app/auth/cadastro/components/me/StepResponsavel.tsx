import { Mail, User } from 'lucide-react'

import { FieldError, fieldA11y } from '../FieldError'
import { PasswordFields } from '../PasswordFields'
import type { FieldErrors } from '../useWizard'
import type { MEData, MEField } from './form'

interface StepResponsavelProps {
  data: MEData
  errors: FieldErrors<MEField>
  onChange: (patch: Partial<MEData>) => void
}

export const StepResponsavel = ({ data, errors, onChange }: StepResponsavelProps) => {
  const wrapClass = (error?: string) => `auth-input-wrap${error ? ' is-invalid' : ''}`

  return (
    <div className='auth-grid-2'>
      <div className='auth-field auth-field-full'>
        <label htmlFor='usuario'>Nome do Responsável</label>
        <div className={wrapClass(errors.usuario)}>
          <input
            id='usuario'
            name='usuario'
            type='text'
            placeholder='Seu nome completo'
            autoComplete='name'
            maxLength={120}
            value={data.usuario}
            onChange={(e) => onChange({ usuario: e.target.value })}
            {...fieldA11y('usuario', errors.usuario)}
          />
          <User size={18} />
        </div>
        <FieldError field='usuario' message={errors.usuario} />
      </div>

      <div className='auth-field auth-field-full'>
        <label htmlFor='email'>E-mail</label>
        <div className={wrapClass(errors.email)}>
          <input
            id='email'
            name='email'
            type='email'
            placeholder='seu.email@empresa.com'
            autoComplete='email'
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            {...fieldA11y('email', errors.email)}
          />
          <Mail size={18} />
        </div>
        <FieldError field='email' message={errors.email} />
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
