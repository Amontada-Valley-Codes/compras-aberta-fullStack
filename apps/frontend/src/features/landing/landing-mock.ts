import type { PublicData } from "@/features/public-data/public-data";
import { landingMunicipalities } from "./landing-municipalities";

export type LandingData = Pick<PublicData, "municipalities" | "local" | "expenses" | "micro">;

export const landingYear = 2026;

export const landingData: LandingData = {
  municipalities: { data: landingMunicipalities, error: null },
  micro: {
    data: {
      data: {
        quantidade_microempresas: 1260,
        quantidade_licitacoes: 1248,
        quantidade_participacoes: 2840,
        valor_total_vencido: "8400000",
        quantidade_itens_vencidos: 4230,
      },
      porte_considerado: ["ME", "Microempresa"],
    },
    error: null,
  },
  expenses: {
    data: {
      data: [
        { codigo_natureza: "30", nome_natureza: "MATERIAL DE CONSUMO", valor_total_dotacao: "54000000", quantidade_dotacoes: 1200, quantidade_licitacoes: 460 },
        { codigo_natureza: "32", nome_natureza: "MATERIAL, BEM OU SERVIÇO PARA DISTRIBUIÇÃO GRATUITA", valor_total_dotacao: "8000000", quantidade_dotacoes: 140, quantidade_licitacoes: 72 },
        { codigo_natureza: "35", nome_natureza: "SERVIÇOS DE CONSULTORIA", valor_total_dotacao: "4000000", quantidade_dotacoes: 95, quantidade_licitacoes: 43 },
        { codigo_natureza: "39", nome_natureza: "OUTROS SERVIÇOS DE TERCEIROS – PESSOA JURÍDICA", valor_total_dotacao: "78000000", quantidade_dotacoes: 1860, quantidade_licitacoes: 728 },
        { codigo_natureza: "40", nome_natureza: "SERVIÇOS DE TECNOLOGIA DA INFORMAÇÃO E COMUNICAÇÃO – PESSOA JURÍDICA", valor_total_dotacao: "11000000", quantidade_dotacoes: 180, quantidade_licitacoes: 80 },
        { codigo_natureza: "51", nome_natureza: "OBRAS E INSTALAÇÕES", valor_total_dotacao: "23000000", quantidade_dotacoes: 360, quantidade_licitacoes: 114 },
        { codigo_natureza: "52", nome_natureza: "EQUIPAMENTOS E MATERIAL PERMANENTE", valor_total_dotacao: "6000000", quantidade_dotacoes: 125, quantidade_licitacoes: 61 },
      ],
      metrica: "valor_total_dotacao",
      observacao: "Dados demonstrativos da landing page.",
    },
    error: null,
  },
  local: {
    data: {
      limit: 1,
      offset: 0,
      data: [],
      resumo: {
        total_licitacoes: 125,
        licitacoes_com_me_local: 48,
        percentual_licitacoes_com_me_local: 38.4,
        total_participacoes: 270,
        participacoes_me_locais: 102,
        percentual_participacoes_me_locais: 37.78,
        valor_total_vencido: "85416667",
        valor_vencido_me_local: "32800000",
        percentual_valor_vencido_me_local: 38.4,
      },
    },
    error: null,
  },
};
