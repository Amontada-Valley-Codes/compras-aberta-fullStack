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

// Todos os modelos comparam microempresas (ME), empresas de pequeno porte
// (EPP) e demais empresas, com a mesma estrutura: indicadores, comparativo
// por porte, seções do tema e metodologia.
export const REPORT_MODELS: ReportModel[] = [
  {
    id: "geral",
    title: "Relatório de compras públicas",
    description: "Comparativo entre ME, EPP e demais empresas, valores por natureza, localização dos fornecedores e evolução mensal.",
  },
  {
    id: "natureza",
    title: "Relatório por natureza da despesa",
    description: "Valor pago a ME, EPP e demais empresas em cada natureza da despesa, com participação e fornecedores por porte.",
  },
  {
    id: "fornecedores",
    title: "Relatório de fornecedores",
    description: "Fornecedores por porte, maiores empresas, origem, cidades e lista completa com CNPJ.",
  },
  {
    id: "despesas",
    title: "Relatório de despesas",
    description: "Pagamentos por natureza e porte, evolução mensal, vencedores das licitações por porte e licitações do período.",
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
