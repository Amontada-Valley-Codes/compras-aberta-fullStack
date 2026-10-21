import { formatCnpj } from '@/lib/format-br'
import type { Municipality } from '@/services/municipalities/municipalities.types'
import { HiddenPassword, ReviewBlock } from '../ReviewBlock'
import { GESTOR_STEPS, STEP_ORGAO, STEP_SERVIDOR, type GestorData } from './form'

interface StepRevisaoProps {
  data: GestorData
  municipalities: Municipality[]
  onEdit: (step: number) => void
}

export const StepRevisao = ({ data, municipalities, onEdit }: StepRevisaoProps) => {
  const municipio =
    municipalities.find(({ id }) => String(id) === data.municipioIbge)?.nome ?? data.municipioIbge
  const message = data.message.trim()

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
            <dt>Telefone</dt>
            <dd>{data.phone}</dd>
          </div>
          <div>
            <dt>Senha</dt>
            <dd>
              <HiddenPassword />
            </dd>
          </div>
        </dl>
      </ReviewBlock>

      <ReviewBlock
        id='revisao-orgao'
        title={GESTOR_STEPS[STEP_ORGAO].title}
        onEdit={() => onEdit(STEP_ORGAO)}>
        <dl className='auth-summary'>
          <div className='is-full'>
            <dt>Órgão ou prefeitura</dt>
            <dd>{data.orgao.trim()}</dd>
          </div>
          <div>
            <dt>Município</dt>
            <dd>{municipio}</dd>
          </div>
          <div>
            <dt>CNPJ do órgão</dt>
            <dd>{formatCnpj(data.cnpj)}</dd>
          </div>
          <div className='is-full'>
            <dt>Objetivo do acesso</dt>
            <dd className={message ? 'auth-summary-text' : 'auth-summary-empty'}>
              {message || 'Não informado'}
            </dd>
          </div>
        </dl>
      </ReviewBlock>
    </div>
  )
}
