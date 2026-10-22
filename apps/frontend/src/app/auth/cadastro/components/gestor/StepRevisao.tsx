import { HiddenPassword, ReviewBlock } from '../ReviewBlock'
import { GESTOR_STEPS, STEP_SERVIDOR, type GestorData } from './form'

interface StepRevisaoProps {
  data: GestorData
  onEdit: (step: number) => void
}

export const StepRevisao = ({ data, onEdit }: StepRevisaoProps) => {
  return (
    <div className='auth-review'>
      <ReviewBlock
        id='revisao-servidor'
        title={GESTOR_STEPS[STEP_SERVIDOR].title}
        onEdit={() => onEdit(STEP_SERVIDOR)}>
        <dl className='auth-summary'>
          <div className='is-full'>
            <dt>Nome completo</dt>
            <dd>{data.name.trim()}</dd>
          </div>
          <div className='is-full'>
            <dt>E-mail institucional</dt>
            <dd>{data.email.trim()}</dd>
          </div>
          <div>
            <dt>Senha</dt>
            <dd>
              <HiddenPassword />
            </dd>
          </div>
        </dl>
      </ReviewBlock>
    </div>
  )
}
