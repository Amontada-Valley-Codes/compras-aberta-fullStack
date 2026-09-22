export interface PeriodQuery {
  codigo_municipio?: string;
  data_inicio?: string;
  data_fim?: string;
}

export interface DetailedBidsQuery {
  codigo_municipio?: string;
  codigo_natureza?: string;
  ano?: number;
  limit?: number;
  offset?: number;
}

export interface DetailedBid {
  codigo_municipio: string;
  municipio: string;
  numero_licitacao: string;
  ano_licitacao: number;
  valor_total_licitacao: string;
  codigo_natureza: string;
  nome_natureza: string;
  cnpj: string | null;
  empresa: string | null;
  porte_empresa: string | null;
  endereco: string | null;
  valor_total_vencido: string;
  quantidade_itens_vencidos: number;
}

export interface DetailedBidsResponse {
  limit: number;
  offset: number;
  data: DetailedBid[];
}

export interface LocalParticipationsQuery {
  codigo_municipio: string;
  ano?: number;
  limit?: number;
  offset?: number;
}

export interface LocalParticipation {
  codigo_municipio: string;
  municipio_consultado: string;
  numero_licitacao: string;
  data_realizacao_licitacao: string;
  cnpj: string | null;
  empresa: string | null;
  valor_total_vencido: string;
}

export interface LocalParticipationsResponse {
  limit: number;
  offset: number;
  data: LocalParticipation[];
  resumo: {
    total_licitacoes: number;
    licitacoes_com_me_local: number;
    percentual_licitacoes_com_me_local: number | null;
    total_participacoes: number;
    participacoes_me_locais: number;
    percentual_participacoes_me_locais: number | null;
    valor_total_vencido: string;
    valor_vencido_me_local: string;
    percentual_valor_vencido_me_local: number | null;
  };
}

export interface ExpensesByNatureResponse {
  data: Array<{
    codigo_natureza: string;
    nome_natureza: string;
    valor_total_dotacao: string;
    quantidade_dotacoes: number;
    quantidade_licitacoes: number;
  }>;
  metrica: string;
  observacao: string;
}

export interface MicroenterpriseQuery extends PeriodQuery {
  codigo_natureza?: string;
}

export interface MicroenterpriseResponse {
  data: {
    quantidade_microempresas: number;
    quantidade_licitacoes: number;
    quantidade_participacoes: number;
    valor_total_vencido: string;
    quantidade_itens_vencidos: number;
  };
  porte_considerado: string[];
}

export interface ParticipationByNatureResponse {
  data: Array<{
    codigo_natureza: string;
    nome_natureza: string;
    quantidade_licitacoes: number;
    licitacoes_com_me: number;
    percentual_licitacoes_com_me: number | null;
    quantidade_participacoes: number;
    participacoes_me: number;
    percentual_participacoes_me: number | null;
    valor_vencido: string;
    valor_vencido_me: string;
    percentual_valor_vencido_me: number | null;
  }>;
}
