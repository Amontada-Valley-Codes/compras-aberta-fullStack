import { useRef, useState } from 'react'

import type { CnpjLookup } from '@/services/access-requests/access-requests.types'

export type CnpjLookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; data: CnpjLookup }
  | { status: 'error'; message: string }

const LOOKUP_FAILED = 'Não encontramos esse CNPJ na Receita Federal agora. Preencha os dados manualmente.'

// Consulta o CNPJ na Receita (via backend). Fica no wizard, e não na etapa,
// para que o resultado continue na tela quando a pessoa volta à etapa 2.
export function useCnpjLookup(onFound: (company: CnpjLookup) => void) {
  const [lookup, setLookup] = useState<CnpjLookupState>({ status: 'idle' })
  // CNPJ da consulta mais recente: se a pessoa mudar o CNPJ enquanto uma
  // consulta anterior ainda responde, a resposta antiga é descartada.
  const lastLookup = useRef('')

  async function search(digits: string) {
    if (digits === lastLookup.current) return
    lastLookup.current = digits
    setLookup({ status: 'loading' })

    try {
      const response = await fetch(`/api/cnpj/${digits}`)
      const data = await response.json().catch(() => null)
      if (lastLookup.current !== digits) return

      if (!response.ok) {
        setLookup({ status: 'error', message: LOOKUP_FAILED })
        return
      }

      setLookup({ status: 'found', data: data as CnpjLookup })
      onFound(data as CnpjLookup)
    } catch {
      if (lastLookup.current !== digits) return
      setLookup({ status: 'error', message: LOOKUP_FAILED })
    }
  }

  function reset() {
    if (!lastLookup.current) return
    lastLookup.current = ''
    setLookup({ status: 'idle' })
  }

  return { lookup, search, reset }
}
