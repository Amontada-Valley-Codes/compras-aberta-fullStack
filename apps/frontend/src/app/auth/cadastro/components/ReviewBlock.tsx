import type { ReactNode } from 'react'
import { Pencil } from 'lucide-react'

interface ReviewBlockProps {
  id: string
  title: string
  onEdit: () => void
  children: ReactNode
}

// Bloco da tela de revisão com o "Editar" que leva de volta à etapa.
export const ReviewBlock = ({ id, title, onEdit, children }: ReviewBlockProps) => (
  <section className='auth-review-block' aria-labelledby={id}>
    <div className='auth-review-head'>
      <h3 id={id}>{title}</h3>
      <button
        type='button'
        className='auth-review-edit'
        onClick={onEdit}
        aria-label={`Editar ${title.toLowerCase()}`}>
        <Pencil size={14} aria-hidden='true' />
        Editar
      </button>
    </div>
    {children}
  </section>
)

export const HiddenPassword = () => (
  <>
    <span aria-hidden='true'>••••••••</span>
    <span className='sr-only'>Senha oculta</span>
  </>
)
