'use client'

import { useState, type FormEvent, type ChangeEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  CircleAlert,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck,
  FileText,
  Loader2,
  Mail,
  UploadCloud,
  User,
} from 'lucide-react'

import { BrandLogo } from '@/components/brand/BrandLogo'
import { toast } from '@/components/ui/sonner'
import { openDocumentInNewTab } from '@/utils/openInNewTab'

const RegisterIllustration = () => (
  <svg
    className='auth-icon'
    viewBox='0 0 140 140'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    role='img'
    aria-label='Ícone de cadastro empresarial'>
    <rect
      x='20'
      y='20'
      width='100'
      height='100'
      rx='16'
      fill='#11169b'
      fillOpacity='0.18'
      stroke='#6ce3f8'
      strokeWidth='6'
    />
    <rect x='36' y='36' width='68' height='12' rx='6' fill='#d9a441' />
    <rect x='36' y='56' width='44' height='8' rx='4' fill='#6ce3f8' />
    <rect x='36' y='70' width='68' height='8' rx='4' fill='#6ce3f8' fillOpacity='0.6' />
    <rect x='36' y='84' width='52' height='8' rx='4' fill='#6ce3f8' fillOpacity='0.4' />
    <circle cx='102' cy='102' r='20' fill='#11169b' stroke='#6ce3f8' strokeWidth='4' />
    <path
      d='M94 102l5 5 10-10'
      stroke='#ffffff'
      strokeWidth='4'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

function formatCNPJ(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

const DOCUMENTS = [
  { field: 'cartao_cnpj', title: 'Cartão CNPJ' },
  { field: 'contrato_social', title: 'Contrato Social' },
  { field: 'comprovante_endereco', title: 'Comprovante de Endereço' },
  { field: 'comprovante_socio', title: 'Comprovante dos Sócios' },
] as const

type DocumentField = (typeof DOCUMENTS)[number]['field']

type SelectedFiles = Partial<Record<DocumentField, File>>

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

// Nomes muito longos tornam a mensagem de erro ilegível: mantém o começo e o fim.
function shortenFileName(name: string) {
  return name.length > 40 ? `${name.slice(0, 24)}…${name.slice(-14)}` : name
}

interface FormSectionProps {
  step: number
  title: string
  hint?: string
  children: ReactNode
}

const FormSection = ({ step, title, hint, children }: FormSectionProps) => {
  const headingId = `cadastro-secao-${step}`

  return (
    <div className='auth-section' role='group' aria-labelledby={headingId}>
      <div className='auth-section-head'>
        <span className='auth-section-step' aria-hidden='true'>
          {step}
        </span>
        <h2 id={headingId} className='auth-section-title'>
          {title}
        </h2>
      </div>
      {hint && <p className='auth-section-hint'>{hint}</p>}
      {children}
    </div>
  )
}

interface DocumentUploadProps {
  field: DocumentField
  title: string
  file?: File
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}

const DocumentUpload = ({ field, title, file, onChange }: DocumentUploadProps) => (
  <div className='auth-file-box'>
    <label htmlFor={field} className='auth-file-label'>
      <div className='auth-file-icon'>
        {file ? <FileCheck size={20} className='text-success' /> : <UploadCloud size={20} />}
      </div>
      <div className='auth-file-info'>
        <span className='auth-file-title'>{title}</span>
        <span className='auth-file-name'>{file ? file.name : 'Clique para selecionar'}</span>
      </div>
      {file && (
        <button
          type='button'
          className='auth-file-preview-btn'
          title='Abrir em nova aba'
          aria-label={`Visualizar ${title}`}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            openDocumentInNewTab(file, title)
          }}>
          <ExternalLink size={14} />
        </button>
      )}
    </label>
    <input
      id={field}
      name={field}
      type='file'
      accept='.pdf,.png,.jpg,.jpeg'
      onChange={onChange}
      required
    />
  </div>
)

export const RegisterME = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cnpjValue, setCnpjValue] = useState('')
  const [files, setFiles] = useState<SelectedFiles>({})
  const router = useRouter()

  const handleCnpjChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCnpjValue(formatCNPJ(e.target.value))
  }

  const handleFileChange = (field: DocumentField) => (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError(
        `O arquivo "${shortenFileName(selectedFile.name)}" tem ${formatFileSize(selectedFile.size)} e excede o tamanho máximo de 5 MB. Escolha um arquivo menor.`,
      )
      e.target.value = '' // Limpa o input
      setFiles((prev) => ({ ...prev, [field]: undefined }))
      return
    }
    setError(null)
    setFiles((prev) => ({ ...prev, [field]: selectedFile }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const formData = new FormData(event.currentTarget)
    // Limpa a máscara do CNPJ ao enviar
    const rawCnpj = cnpjValue.replace(/\D/g, '')
    formData.set('cnpj', rawCnpj)

    // Validação client-side dos arquivos
    const requiredFiles = DOCUMENTS.map((doc) => doc.field)

    const missing = requiredFiles.filter((f) => !files[f])
    if (missing.length > 0) {
      setError('Por favor, anexe todos os 4 documentos obrigatórios.')
      setPending(false)
      return
    }

    // Verifica o tamanho dos arquivos selecionados
    for (const key of requiredFiles) {
      const file = files[key]
      if (file && file.size > MAX_FILE_SIZE_BYTES) {
        setError(
          `O arquivo "${shortenFileName(file.name)}" possui ${formatFileSize(file.size)} e excede o limite máximo permitido de 5 MB.`,
        )
        setPending(false)
        return
      }
    }

    try {
      const response = await fetch('/api/business/register', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        let msg = data?.message ?? 'Não foi possível realizar o cadastro. Verifique os dados.'
        if (data?.issues?.fieldErrors) {
          const details = Object.entries(data.issues.fieldErrors)
            .map(([field, errs]) => `${field}: ${(errs as string[]).join(', ')}`)
            .join(' | ')
          if (details) msg += ` (${details})`
        }
        setError(msg)
        setPending(false)
        return
      }

      toast.success('Solicitação cadastral enviada com sucesso!', {
        description:
          data?.message ??
          'Seus dados e comprovantes foram recebidos e estão em análise pelo administrador. Você receberá um aviso assim que for aprovada.',
        duration: 8000,
      })

      router.push('/auth/login?status=pending')
    } catch {
      setError('Não foi possível conectar ao servidor. Verifique sua conexão.')
      setPending(false)
    }
  }

  return (
    <div className='auth-page'>
      <div className='auth-shell auth-shell-wide'>
        <div className='auth-visual'>
          <div className='auth-icon-wrap'>
            <RegisterIllustration />
          </div>
          <BrandLogo inverse />
        </div>

        <div className='auth-panel'>
          <Link href='/auth/login' className='auth-back'>
            <ChevronLeft size={18} />
            Voltar para o Login
          </Link>

          <h1>Cadastre sua Microempresa (ME)</h1>
          <p className='auth-subtitle'>
            Preencha os dados da sua empresa e envie os comprovantes para liberação de acesso.
          </p>

          <form className='auth-form' onSubmit={handleSubmit}>
            <FormSection step={1} title='Dados do Responsável'>
              <div className='auth-grid-2'>
                <div className='auth-field auth-field-full'>
                  <label htmlFor='usuario'>Nome do Responsável</label>
                  <div className='auth-input-wrap'>
                    <input
                      id='usuario'
                      name='usuario'
                      type='text'
                      placeholder='Seu nome completo'
                      required
                      minLength={3}
                      maxLength={120}
                    />
                    <User size={18} />
                  </div>
                </div>

                <div className='auth-field'>
                  <label htmlFor='email'>E-mail</label>
                  <div className='auth-input-wrap'>
                    <input
                      id='email'
                      name='email'
                      type='email'
                      placeholder='seu.email@empresa.com'
                      autoComplete='email'
                      required
                    />
                    <Mail size={18} />
                  </div>
                </div>

                <div className='auth-field'>
                  <label htmlFor='password'>Senha de Acesso</label>
                  <div className='auth-input-wrap'>
                    <input
                      id='password'
                      name='password'
                      type={showPassword ? 'text' : 'password'}
                      placeholder='Mínimo 6 caracteres'
                      required
                      minLength={6}
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                      {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection step={2} title='Dados da Empresa'>
              <div className='auth-grid-2'>
                <div className='auth-field auth-field-full'>
                  <label htmlFor='nome_empresa'>Nome Fantasia / Razão Social</label>
                  <div className='auth-input-wrap'>
                    <input
                      id='nome_empresa'
                      name='nome_empresa'
                      type='text'
                      placeholder='Nome da sua empresa'
                      required
                      minLength={2}
                      maxLength={200}
                    />
                    <FileText size={18} />
                  </div>
                </div>

                <div className='auth-field'>
                  <label htmlFor='cnpj'>CNPJ da Empresa</label>
                  <div className='auth-input-wrap'>
                    <input
                      id='cnpj'
                      name='cnpj'
                      type='text'
                      value={cnpjValue}
                      onChange={handleCnpjChange}
                      placeholder='00.000.000/0000-00'
                      required
                      maxLength={18}
                    />
                    <Building2 size={18} />
                  </div>
                </div>

                <div className='auth-field'>
                  <label htmlFor='porte_empresa'>Porte da Empresa</label>
                  <div className='auth-input-wrap auth-select-wrap'>
                    <select
                      id='porte_empresa'
                      name='porte_empresa'
                      defaultValue='ME'
                      className='auth-select'
                      required>
                      <option value='ME'>ME - Microempresa</option>
                    </select>
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection
              step={3}
              title='Documentação Comprobatória'
              hint='Anexe os 4 documentos em PDF, PNG ou JPG, com até 5 MB cada.'>
              <div className='auth-docs-grid'>
                {DOCUMENTS.map(({ field, title }) => (
                  <DocumentUpload
                    key={field}
                    field={field}
                    title={title}
                    file={files[field]}
                    onChange={handleFileChange(field)}
                  />
                ))}
              </div>
            </FormSection>

            {error && (
              <p className='auth-alert' role='alert'>
                <CircleAlert size={18} aria-hidden='true' />
                <span>{error}</span>
              </p>
            )}

            <button
              type='submit'
              className='button button-primary auth-submit'
              disabled={pending}>
              {pending && <Loader2 className='auth-submit-spinner' size={18} />}
              {pending ? 'Enviando cadastro…' : 'Finalizar Cadastro da Empresa'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
