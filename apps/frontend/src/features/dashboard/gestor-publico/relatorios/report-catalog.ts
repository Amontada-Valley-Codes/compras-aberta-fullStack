// Sem "use client": a página lista os modelos e a rota de dados valida o
// modelo pedido com a mesma lista.

export const REPORT_MODEL_IDS = ["geral", "natureza", "fornecedores", "despesas", "receitas"] as const;
export type ReportModelId = (typeof REPORT_MODEL_IDS)[number];

export interface ReportModel {
  id: ReportModelId;
  title: string;
  description: string;
  // Sem fonte de dados no sistema: aparece na lista, mas não pode ser gerado.
  unavailableReason?: string;
}

export const REPORT_MODELS: ReportModel[] = [
  {
    id: "geral",
    title: "Relatório de compras públicas",
    description: "Apresentação, metodologia e tabelas por natureza, porte e localização dos fornecedores identificados.",
  },
  {
    id: "natureza",
    title: "Relatório por natureza da despesa",
    description: "Dotação, licitações e participação das microempresas em cada natureza da despesa.",
  },
  {
    id: "fornecedores",
    title: "Relatório de fornecedores",
    description: "Microempresas vencedoras, origem, concentração do valor e lista completa com CNPJ.",
  },
  {
    id: "despesas",
    title: "Relatório de despesas",
    description: "Dotação por natureza, evolução mensal e lista de todas as licitações do período.",
  },
  {
    id: "receitas",
    title: "Relatório de receitas",
    description: "Arrecadação e receitas públicas do município.",
    unavailableReason: "Os dados de receitas ainda não estão integrados ao sistema.",
  },
];

export const AVAILABLE_REPORT_MODEL_IDS = REPORT_MODELS.filter((model) => !model.unavailableReason).map((model) => model.id);

export function reportModel(id: ReportModelId): ReportModel {
  return REPORT_MODELS.find((model) => model.id === id) ?? REPORT_MODELS[0];
}
