import { useCallback, useRef, type MouseEvent } from 'react'
import { ExternalLink, FileText, RefreshCw, Trash2, UploadCloud } from 'lucide-react'

import { openDocumentInNewTab } from '@/utils/openInNewTab'
import { FieldError, fieldA11y } from '../FieldError'
import type { FieldErrors } from '../useWizard'
import { DOCUMENTS, formatFileSize, type DocumentField, type MEData, type MEField } from './form'

interface StepDocumentosProps {
  files: MEData['files']
  errors: FieldErrors<MEField>
  onSelect: (field: DocumentField, file: File) => void
  onRemove: (field: DocumentField) => void
}

export const StepDocumentos = ({ files, errors, onSelect, onRemove }: StepDocumentosProps) => (
  <div className='auth-docs-grid'>
    {DOCUMENTS.map(({ field, title }) => (
      <DocumentUpload
        key={field}
        field={field}
        title={title}
        file={files[field]}
        error={errors[field]}
        onSelect={(file) => onSelect(field, file)}
        onRemove={() => onRemove(field)}
      />
    ))}
  </div>
)

interface DocumentUploadProps {
  field: DocumentField
  title: string
  file?: File
  error?: string
  onSelect: (file: File) => void
  onRemove: () => void
}

// Os botões ficam dentro do <label>: sem o preventDefault, o clique também
// abriria o seletor de arquivos.
function stopLabelClick(e: MouseEvent<HTMLButtonElement>) {
  e.preventDefault()
  e.stopPropagation()
}

const DocumentUpload = ({ field, title, file, error, onSelect, onRemove }: DocumentUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className='auth-file-field'>
      <div className={`auth-file-box${file ? ' has-file' : ''}${error ? ' is-invalid' : ''}`}>
        <label htmlFor={field} className='auth-file-label'>
          {file ? (
            <FilePreview file={file} />
          ) : (
            <div className='auth-file-icon'>
              <UploadCloud size={20} />
            </div>
          )}
          <div className='auth-file-info'>
            <span id={`${field}-titulo`} className='auth-file-title'>
              {title}
            </span>
            <span id={`${field}-arquivo`} className='auth-file-name'>
              {file ? file.name : 'Clique ou arraste o arquivo'}
            </span>
            {file && <span className='auth-file-size'>{formatFileSize(file.size)}</span>}
          </div>
          {file && (
            <div className='auth-file-actions'>
              <button
                type='button'
                className='auth-file-preview-btn'
                title='Abrir em nova aba'
                aria-label={`Visualizar ${title}`}
                onClick={(e) => {
                  stopLabelClick(e)
                  openDocumentInNewTab(file, title)
                }}>
                <ExternalLink size={14} />
              </button>
              <button
                type='button'
                className='auth-file-preview-btn'
                title='Trocar arquivo'
                aria-label={`Trocar ${title}`}
                onClick={(e) => {
                  stopLabelClick(e)
                  inputRef.current?.click()
                }}>
                <RefreshCw size={14} />
              </button>
              <button
                type='button'
                className='auth-file-preview-btn is-danger'
                title='Remover arquivo'
                aria-label={`Remover ${title}`}
                onClick={(e) => {
                  stopLabelClick(e)
                  onRemove()
                }}>
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </label>
        <input
          ref={inputRef}
          id={field}
          name={field}
          type='file'
          accept='.pdf,.png,.jpg,.jpeg'
          // Sem isso o nome lido pelo leitor de tela incluiria os três botões do label.
          aria-labelledby={`${field}-titulo ${field}-arquivo`}
          onChange={(e) => {
            const selected = e.target.files?.[0]
            // O arquivo fica guardado no estado do wizard. Limpar o input
            // permite escolher o mesmo arquivo de novo depois de remover.
            e.target.value = ''
            if (selected) onSelect(selected)
          }}
          {...fieldA11y(field, error)}
        />
      </div>
      <FieldError field={field} message={error} />
    </div>
  )
}

// Miniatura das imagens; PDF mostra só o ícone. A URL temporária é criada
// quando a <img> entra na tela e liberada quando ela sai ou o arquivo muda.
const FilePreview = ({ file }: { file: File }) => {
  const thumbRef = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img) return
      const url = URL.createObjectURL(file)
      img.src = url
      return () => URL.revokeObjectURL(url)
    },
    [file],
  )

  if (!file.type.startsWith('image/')) {
    return (
      <div className='auth-file-icon is-pdf'>
        <FileText size={20} />
      </div>
    )
  }

  // next/image não serve aqui: a imagem é um arquivo local (blob), não uma URL.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={thumbRef} className='auth-file-thumb' alt='' />
}
