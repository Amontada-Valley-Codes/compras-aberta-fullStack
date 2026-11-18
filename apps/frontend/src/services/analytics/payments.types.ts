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

// GET /analytics/pagamentos/outros-portes: só EPP (porte 03) e demais
// empresas (porte 05), no ano civil completo, sem recorte por natureza.
export interface OtherSizesPaymentsResponse {
  filtros?: { codigo_municipio: string; ano: number; categoria_porte?: string | null; porte_codigo?: string | null };
  periodo?: { inicio: string; fim: string };
  resumo: Array<{
    categoria_porte: string;
    porte_codigo: string;
    total_valor: string;
    quantidade_pagamentos: number;
    percentual_valor?: number | null;
  }>;
  municipios: Array<{
    codigo_municipio: string;
    codigo_ibge?: string | null;
    nome?: string | null;
    valores: Record<string, string>;
    quantidade_pagamentos: number;
    quantidade_pagamentos_por_porte: Record<string, number>;
  }>;
  evolucao_temporal: Array<{
    periodo?: string | null;
    ano?: number | null;
    mes?: number | null;
    categoria_porte: string;
    porte_codigo: string;
    total_valor: string;
    quantidade_pagamentos: number;
  }>;
  total_valor: string;
  quantidade_pagamentos: number;
  fonte_classificacao: string;
  observacao: string;
}

export interface LocalPaymentResponse {
  limit: number;
  offset: number;
  coleta_id: number;
  ano: number;
  data: Array<{
    codigo_municipio: string;
    municipio_consultado: string;
    codigo_natureza: string;
    nome_natureza: string | null;
    documento: string;
    empresa: string | null;
    categoria_porte: string;
    porte_codigo: string | null;
    municipio_empresa: string;
    uf_empresa: string | null;
    quantidade_pagamentos: number;
    valor_pago: string;
  }>;
  resumo: {
    total_fornecedores: number;
    fornecedores_me_locais: number;
    percentual_fornecedores_me_locais: number | null;
    total_pagamentos: number;
    pagamentos_me_locais: number;
    percentual_pagamentos_me_locais: number | null;
    total_controle: string;
    valor_pago_me_local: string;
    percentual_valor_pago_me_local: number | null;
  };
}
