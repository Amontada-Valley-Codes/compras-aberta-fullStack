import { FileCheck } from 'lucide-react'

import { formatCnpj } from '@/lib/format-br'
import { HiddenPassword, ReviewBlock } from '../ReviewBlock'
import {
  DOCUMENTS,
  ME_STEPS,
  PORTES,
  STEP_DOCUMENTOS,
  STEP_EMPRESA,
  STEP_RESPONSAVEL,
  formatFileSize,
  type MEData,
} from './form'

interface StepRevisaoProps {
  data: MEData
  onEdit: (step: number) => void
}

export const StepRevisao = ({ data, onEdit }: StepRevisaoProps) => {
  const porte = PORTES.find(({ value }) => value === data.porte_empresa)?.label ?? data.porte_empresa

  return (
    <div className='auth-review'>
      <ReviewBlock
        id='revisao-responsavel'
        title={ME_STEPS[STEP_RESPONSAVEL].title}
        onEdit={() => onEdit(STEP_RESPONSAVEL)}>
        <dl className='auth-summary'>
          <div className='is-full'>
            <dt>Nome do responsável</dt>
            <dd>{data.usuario.trim()}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
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

      <ReviewBlock
        id='revisao-empresa'
        title={ME_STEPS[STEP_EMPRESA].title}
        onEdit={() => onEdit(STEP_EMPRESA)}>
        <dl className='auth-summary'>
          <div className='is-full'>
            <dt>Razão social / Nome fantasia</dt>
            <dd>{data.nome_empresa.trim()}</dd>
          </div>
          <div>
            <dt>CNPJ</dt>
            <dd>{formatCnpj(data.cnpj)}</dd>
          </div>
          <div>
            <dt>Porte</dt>
            <dd>{porte}</dd>
          </div>
        </dl>
      </ReviewBlock>

      <ReviewBlock
        id='revisao-documentos'
        title={ME_STEPS[STEP_DOCUMENTOS].title}
        onEdit={() => onEdit(STEP_DOCUMENTOS)}>
        <ul className='auth-review-files'>
          {DOCUMENTS.map(({ field, title }) => {
            const file = data.files[field]
            return (
              <li key={field}>
                <FileCheck size={18} aria-hidden='true' />
                <div>
                  <b>{title}</b>
                  <span>{file ? `${file.name} · ${formatFileSize(file.size)}` : 'Não anexado'}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </ReviewBlock>
    </div>
  )
}
