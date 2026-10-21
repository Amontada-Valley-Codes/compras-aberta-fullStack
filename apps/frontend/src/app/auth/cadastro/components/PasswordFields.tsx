import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { FieldError, fieldA11y } from './FieldError'

interface PasswordFieldsProps {
  password: string
  passwordConfirmation: string
  errors: { password?: string; passwordConfirmation?: string }
  onChange: (patch: { password?: string; passwordConfirmation?: string }) => void
}

// Senha + confirmação lado a lado (empilhadas no celular). O olho mostra as duas.
export const PasswordFields = ({ password, passwordConfirmation, errors, onChange }: PasswordFieldsProps) => {
  const [showPassword, setShowPassword] = useState(false)
  const type = showPassword ? 'text' : 'password'

  return (
    <>
      <div className='auth-field'>
        <label htmlFor='password'>Senha de Acesso</label>
        <div className={`auth-input-wrap${errors.password ? ' is-invalid' : ''}`}>
          <input
            id='password'
            name='password'
            type={type}
            placeholder='Mínimo 6 caracteres'
            autoComplete='new-password'
            value={password}
            onChange={(e) => onChange({ password: e.target.value })}
            {...fieldA11y('password', errors.password)}
          />
          <button
            type='button'
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar senhas' : 'Mostrar senhas'}>
            {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
        <FieldError field='password' message={errors.password} />
      </div>

      <div className='auth-field'>
        <label htmlFor='passwordConfirmation'>Confirmar Senha</label>
        <div className={`auth-input-wrap${errors.passwordConfirmation ? ' is-invalid' : ''}`}>
          <input
            id='passwordConfirmation'
            name='passwordConfirmation'
            type={type}
            placeholder='Repita a senha'
            autoComplete='new-password'
            value={passwordConfirmation}
            onChange={(e) => onChange({ passwordConfirmation: e.target.value })}
            {...fieldA11y('passwordConfirmation', errors.passwordConfirmation)}
          />
        </div>
        <FieldError field='passwordConfirmation' message={errors.passwordConfirmation} />
      </div>
    </>
  )
}
