// Sem "use client": usado pelo servidor (que monta o relatório com os dados
// reais) e pelo navegador (que desenha o arquivo).
//
// O relatório é descrito como seções e blocos, com os valores já formatados.
// Cada formato de arquivo (PDF, PNG…) só desenha esses blocos; um formato novo
// não precisa saber de onde vêm os dados.

import type { ReportModelId } from "./report-catalog";

export interface ReportKpi {
  label: string;
  value: string;
  detail?: string;
}

// Cor de uma série nos gráficos (cada porte de empresa tem a sua).
export type ReportTone = "primary" | "gold" | "slate" | "light";

export interface ReportColumn {
  label: string;
  // Largura relativa: as colunas dividem a largura da página nessa proporção.
  width: number;
  align?: "left" | "right";
}

export type ReportBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "kpis"; items: ReportKpi[] }
  | { kind: "table"; title?: string; columns: ReportColumn[]; rows: string[][]; total?: string[]; emptyText: string }
  | { kind: "bars"; title?: string; items: Array<{ label: string; value: number; display: string; tone?: ReportTone }>; emptyText: string }
  // Barra 100% por linha, dividida em séries (ex.: ME, EPP e demais).
  | {
      kind: "stacked";
      title?: string;
      legend: Array<{ label: string; tone: ReportTone }>;
      items: Array<{ label: string; segments: number[]; display: string }>;
      emptyText: string;
    }
  | { kind: "note"; text: string };

export interface ReportSection {
  title: string;
  description?: string;
  // Começa a seção numa folha nova (só nos formatos paginados).
  pageBreakBefore?: boolean;
  blocks: ReportBlock[];
}

export interface ReportDocument {
  model: ReportModelId;
  title: string;
  summary: string;
  municipality: string;
  state: string;
  year: number;
  period: string;
  nature: string;
  // ISO; cada formato mostra no fuso de Fortaleza.
  generatedAt: string;
  source: string;
  sections: ReportSection[];
}
