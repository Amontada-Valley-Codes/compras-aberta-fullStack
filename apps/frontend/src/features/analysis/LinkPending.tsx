"use client";

import { useLinkStatus } from "next/link";

// Vai dentro de um <Link>: mostra um spinner enquanto a página aberta por ele
// carrega. A troca de página da tabela busca tudo de novo no servidor e leva
// alguns segundos; sem isso parecia que o clique não tinha funcionado.
export function LinkPending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="analysis-link-pending" role="status" aria-label="Carregando" /> : null;
}
