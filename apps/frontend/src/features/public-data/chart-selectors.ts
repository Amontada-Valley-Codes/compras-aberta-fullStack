import type { ExpensesByNatureResponse, ParticipationByNatureResponse } from "@/services/analytics/analytics.types";
import { KNOWN_NATURE_CODES } from "./plain-language";

// Sem "use client": estas funções são puras e precisam ser chamáveis tanto
// pelos gráficos (client component, em PublicCharts.tsx) quanto pela página
// de análise (server component, em features/analysis/MunicipalityAnalysisPage.tsx)
// ao montar o resumo usado na exportação em PDF. Um módulo marcado "use
// client" não pode ter suas funções chamadas a partir do servidor, mesmo
// quando são puras — daí viverem num arquivo à parte.

type ExpenseRow = ExpensesByNatureResponse["data"][number];
type ParticipationRow = ParticipationByNatureResponse["data"][number];

// A API omite os tipos de compra sem nenhuma licitação no período; aqui eles
// voltam com valor zero para que todos apareçam no gráfico. Sem nenhuma linha
// (erro ou consulta vazia) nada é inventado, e a tela mostra o estado vazio.
function withAllNatures<T extends { codigo_natureza: string }>(data: T[], zeroRow: (code: string) => T): T[] {
  if (!data.length) return [];
  const present = new Set(data.map((item) => item.codigo_natureza));
  return [...data, ...KNOWN_NATURE_CODES.filter((code) => !present.has(code)).map(zeroRow)];
}

const zeroExpense = (code: string): ExpenseRow => ({
  codigo_natureza: code,
  nome_natureza: "",
  valor_total_dotacao: "0",
  quantidade_dotacoes: 0,
  quantidade_licitacoes: 0,
});

const zeroParticipation = (code: string): ParticipationRow => ({
  codigo_natureza: code,
  nome_natureza: "",
  quantidade_licitacoes: 0,
  licitacoes_com_me: 0,
  percentual_licitacoes_com_me: 0,
  quantidade_participacoes: 0,
  participacoes_me: 0,
  percentual_participacoes_me: 0,
  valor_vencido: "0",
  valor_vencido_me: "0",
  percentual_valor_vencido_me: 0,
});

export function selectExpenseRows(data: ExpensesByNatureResponse["data"]) {
  return withAllNatures(data, zeroExpense)
    .sort((a, b) => Number(b.valor_total_dotacao) - Number(a.valor_total_dotacao));
}

export function selectParticipationRows(data: ParticipationByNatureResponse["data"], compactView = false) {
  const rows = withAllNatures(data, zeroParticipation)
    .sort((a, b) => (b.percentual_participacoes_me ?? 0) - (a.percentual_participacoes_me ?? 0));
  return compactView ? rows.slice(0, 4) : rows;
}

export function selectMicroenterpriseValueRows(data: ParticipationByNatureResponse["data"]) {
  return withAllNatures(data, zeroParticipation)
    .sort((a, b) => Number(b.valor_vencido_me) - Number(a.valor_vencido_me));
}
