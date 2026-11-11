import type { jsPDF } from "jspdf";
import type { ReportDocument } from "./report-document";
import { layoutReport, type BoxStyle, type ReportImage, type Surface, type TextStyle } from "./report-layout";

// PDF de verdade (texto selecionável, tabelas e paginação), desenhado com o
// jsPDF a partir do template de report-layout.

// As fontes padrão do PDF (Helvetica) cobrem o português; espaços especiais
// do Intl viram espaço comum.
const clean = (text: string) => text.replace(/[\u00A0\u202F]/g, " ");

export function createPdfSurface(doc: jsPDF): Surface {
  const applyFont = (style: TextStyle) => {
    const family = style.fontFamily === "serif" ? "times" : "helvetica";
    doc.setFont(family, style.bold ? "bold" : "normal");
    doc.setFontSize(style.size);
  };

  return {
    paginated: true,
    measure(text, style) {
      applyFont(style);
      return doc.getTextWidth(clean(text));
    },
    text(text, x, y, style, align = "left") {
      applyFont(style);
      doc.setTextColor(style.color);
      doc.text(clean(text), x, y, { align, baseline: "alphabetic" });
    },
    box(x, y, width, height, { fill, stroke, lineWidth = 0.2, radius = 0 }: BoxStyle) {
      if (!fill && !stroke) return;
      if (fill) doc.setFillColor(fill);
      if (stroke) {
        doc.setDrawColor(stroke);
        doc.setLineWidth(lineWidth);
      }
      const mode = fill && stroke ? "FD" : fill ? "F" : "S";
      const r = Math.min(radius, width / 2, height / 2);
      if (r > 0) doc.roundedRect(x, y, width, height, r, r, mode);
      else doc.rect(x, y, width, height, mode);
    },
    line(x1, y1, x2, y2, color, width) {
      doc.setDrawColor(color);
      doc.setLineWidth(width);
      doc.line(x1, y1, x2, y2);
    },
    image(image: ReportImage, x, y, width, height) {
      // O alias faz o jsPDF guardar a imagem uma vez só.
      doc.addImage(image.src, "PNG", x, y, width, height, "compras-abertas-logo", "FAST");
    },
    addPage() {
      doc.addPage("a4", "portrait");
    },
    pageCount: () => doc.getNumberOfPages(),
    goToPage(page) {
      doc.setPage(page);
    },
  };
}

export async function renderPdf(report: ReportDocument, assets: { logo: ReportImage | null }): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  doc.setProperties({
    title: `${report.title} · ${report.municipality}/${report.state} · ${report.year}`,
    subject: report.summary,
    author: "Compras Abertas",
    creator: "Compras Abertas",
  });
  layoutReport(report, createPdfSurface(doc), { logo: assets.logo });
  return doc.output("blob");
}
