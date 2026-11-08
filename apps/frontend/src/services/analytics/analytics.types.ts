import type { z } from "zod";
import type { microenterpriseQuerySchema } from "@/schemas/analytics/get-microenterprise-indicator.schema";
import type { detailedBidsQuerySchema } from "@/schemas/analytics/list-detailed-bids.schema";
import type { expensesByNatureQuerySchema } from "@/schemas/analytics/list-expenses-by-nature.schema";
import type { generalParticipationsQuerySchema } from "@/schemas/analytics/list-general-participations.schema";
import type { localParticipationsQuerySchema } from "@/schemas/analytics/list-local-participations.schema";

// Os tipos de consulta vêm dos schemas Zod, que são a fonte da verdade: mudar
// uma regra de validação já atualiza o tipo usado pelos services.
export type PeriodQuery = z.input<typeof expensesByNatureQuerySchema>;
export type DetailedBidsQuery = z.input<typeof detailedBidsQuerySchema>;
export type LocalParticipationsQuery = z.input<typeof localParticipationsQuerySchema>;
export type GeneralParticipationsQuery = z.input<typeof generalParticipationsQuerySchema>;
export type MicroenterpriseQuery = z.input<typeof microenterpriseQuerySchema>;

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

export interface LocalParticipation {
  codigo_municipio: string;
  municipio_consultado: string;
  numero_licitacao: string;
  data_realizacao_licitacao: string | null;
  cnpj: string;
  empresa: string | null;
  porte_empresa: string | null;
  municipio_empresa: string | null;
  uf_empresa: string | null;
  endereco: string | null;
  valor_total_vencido: string;
  quantidade_itens_vencidos: number;
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
    itens_vencidos: number;
    itens_vencidos_me_locais: number;
    percentual_itens_vencidos_me_locais: number | null;
  };
}

// Mesmo formato de item de LocalParticipation, mas sem o recorte "só locais":
// traz toda ME vencedora no município, de qualquer origem.
export interface GeneralParticipationsResponse {
  limit: number;
  offset: number;
  data: LocalParticipation[];
  resumo: {
    total_licitacoes: number;
    licitacoes_com_me: number;
    percentual_licitacoes_com_me: number | null;
    total_participacoes: number;
    participacoes_me: number;
    percentual_participacoes_me: number | null;
    valor_total_vencido: string;
    valor_vencido_me: string;
    percentual_valor_vencido_me: number | null;
    itens_vencidos: number;
    itens_vencidos_me: number;
    percentual_itens_vencidos_me: number | null;
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
  associacao: string;
  observacao: string;
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
