import { loadReportLogo } from "./report-assets";
import type { ReportDocument } from "./report-document";

// Formatos de arquivo do relatório. Todos desenham o mesmo template
// (report-layout); para um formato novo, basta incluir um item aqui com a
// sua função de desenho.

export type ReportFormatId = "pdf" | "png";

export interface ReportFormat {
  id: ReportFormatId;
  label: string;
  description: string;
  extension: string;
  render: (report: ReportDocument) => Promise<Blob>;
}

export const REPORT_FORMATS: ReportFormat[] = [
  {
    id: "pdf",
    label: "PDF",
    description: "Documento A4 paginado, com tabelas completas. Ideal para apresentar, imprimir e arquivar.",
    extension: "pdf",
    render: async (report) => {
      const [{ renderPdf }, logo] = await Promise.all([import("./surface-pdf"), loadReportLogo()]);
      return renderPdf(report, { logo });
    },
  },
  {
    id: "png",
    label: "PNG",
    description: "Imagem em alta resolução para mensagens e apresentações. Listas longas mostram as 40 primeiras linhas.",
    extension: "png",
    render: async (report) => {
      const [{ renderPng }, logo] = await Promise.all([import("./surface-png"), loadReportLogo()]);
      return renderPng(report, { logo });
    },
  },
];

export function reportFormat(id: ReportFormatId): ReportFormat {
  return REPORT_FORMATS.find((format) => format.id === id) ?? REPORT_FORMATS[0];
}
