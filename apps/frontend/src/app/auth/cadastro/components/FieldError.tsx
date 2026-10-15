import { CircleAlert } from 'lucide-react'

const errorId = (field: string) => `${field}-erro`

// Liga o campo à mensagem de erro para leitores de tela: quando a etapa não
// valida, o foco vai para o primeiro campo inválido e a mensagem é lida junto.
export function fieldA11y(field: string, error?: string) {
  return error ? { 'aria-invalid': true, 'aria-describedby': errorId(field) } : {}
}

export const FieldError = ({ field, message }: { field: string; message?: string }) => {
  if (!message) return null

  return (
    <small id={errorId(field)} className='auth-field-error'>
      <CircleAlert size={14} aria-hidden='true' />
      <span>{message}</span>
    </small>
  )
}
