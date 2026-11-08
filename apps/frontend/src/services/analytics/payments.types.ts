// Respostas conforme o Swagger da API de dados. Valores monetários são decimais em string.
export interface PaymentCollection {
  coleta_id: number;
  codigo_municipio: string;
  exercicio_orcamento: string;
  referencia_empenhos_inicio: string;
  referencia_empenhos_fim: string;
  referencia_pagamentos_inicio: string;
  referencia_pagamentos_fim: string;
  orgaos_excluidos: (string)[];
  regra_mei: string;
  fonte_cadastral: string;
  referencia_base_cadastral: string;
  status: string;
  reconciliado?: boolean | null;
  quantidade_pendencias?: number | null;
  finalizado_em?: string | null;
}

export interface PaymentNature {
  codigo_natureza: string;
  nome_natureza: string;
  total_controle: string;
  quantidade_pagamentos: number;
  valores_por_categoria: Record<string, string>;
  valor_me: string;
  percentual_me?: number | null;
  reconciliado: boolean;
}

export interface PaymentsSummaryResponse {
  coleta: PaymentCollection;
  data: (PaymentNature)[];
  total_controle: string;
  total_me: string;
  percentual_me?: number | null;
  pendencias: (PaymentIssue)[];
  observacao: string;
}

export interface PaymentIssue {
  tipo: string;
  quantidade: number;
  valor?: string | null;
}

export interface PaymentSupplier {
  codigo_natureza: string;
  nome_natureza?: string | null;
  documento: string;
  tipo_documento?: string | null;
  nome_negociante?: string | null;
  categoria_porte: string;
  porte_codigo?: string | null;
  situacao_classificacao?: string | null;
  quantidade_pagamentos: number;
  valor_pago: string;
}

export interface PaymentSuppliersResponse {
  limit: number;
  offset: number;
  coleta_id: number;
  data: (PaymentSupplier)[];
}
