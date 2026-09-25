export interface AnalysisExportKpi {
  label: string;
  value: string;
  detail: string;
}

export interface AnalysisExportNatureLegendItem {
  code: string;
  name: string;
}

export interface AnalysisExportChartSection {
  id: string;
  title: string;
  description: string;
  hasChart: boolean;
  emptyText: string;
  // Só para gráficos cujo eixo mostra o código da natureza (a tela usa uma
  // legenda separada, "NatureKey", para explicar cada código).
  natureLegend?: AnalysisExportNatureLegendItem[];
}

export interface AnalysisExportShareData {
  meLabel: string;
  meValue: string;
  othersLabel: string;
  othersValue: string;
  note: string;
}

export interface AnalysisExportShareChart {
  id: string;
  title: string;
  description: string;
  emptyText: string;
  data: AnalysisExportShareData | null;
}

export interface AnalysisExportSummary {
  eyebrow: string;
  municipalityName: string;
  year: number;
  natureName: string;
  kpis: AnalysisExportKpi[];
  highestNatureText: string | null;
  chartSections: AnalysisExportChartSection[];
  shareCharts: AnalysisExportShareChart[];
}

const PAGE_MARGIN = 15;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

function loadImageSize(dataUri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Não foi possível ler a imagem do gráfico."));
    image.src = dataUri;
  });
}

// Os gráficos são renderizados só no cliente (ApexCharts/SVG), então a
// captura também precisa acontecer no cliente: usamos o exportador nativo do
// próprio ApexCharts (por id do gráfico) em vez de gerar as imagens no servidor.
async function captureChart(id: string): Promise<string | null> {
  const { default: ApexCharts } = await import("apexcharts");

  try {
    const result = await ApexCharts.exec(id, "dataURI", { scale: 2 });
    return result && "imgURI" in result ? result.imgURI : null;
  } catch {
    return null;
  }
}

const MUTED_TEXT = 110;
const BODY_TEXT = 30;

export async function exportChartsToPdf(summary: AnalysisExportSummary): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = PAGE_MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_HEIGHT - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
  };

  const paragraph = (text: string, size: number, color: number, lineHeight: number) => {
    doc.setFontSize(size);
    doc.setTextColor(color);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
    ensureSpace(lines.length * lineHeight);
    doc.text(lines, PAGE_MARGIN, y);
    y += lines.length * lineHeight;
  };

  // Cabeçalho: eyebrow + título, no mesmo padrão de título e subtítulo usado
  // nos cards do painel (dashboard).
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(MUTED_TEXT);
  doc.text(summary.eyebrow.toUpperCase(), PAGE_MARGIN, y);
  y += 6;

  doc.setFontSize(17);
  doc.setTextColor(BODY_TEXT);
  doc.text(`Licitações e participação de ME em ${summary.municipalityName}`, PAGE_MARGIN, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(MUTED_TEXT);
  doc.text(`Exercício ${summary.year} · Natureza: ${summary.natureName}`, PAGE_MARGIN, y);
  y += 10;

  // KPIs
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(MUTED_TEXT);
  doc.text("INDICADORES-CHAVE", PAGE_MARGIN, y);
  y += 6;

  for (const kpi of summary.kpis) {
    ensureSpace(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(BODY_TEXT);
    doc.text(kpi.value, PAGE_MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(MUTED_TEXT);
    doc.text(kpi.label, PAGE_MARGIN + 40, y - 1.5);
    doc.text(kpi.detail, PAGE_MARGIN + 40, y + 3.5);
    y += 10;
  }
  y += 2;

  if (summary.highestNatureText) {
    paragraph(summary.highestNatureText, 10, BODY_TEXT, 5);
    y += 4;
  }

  async function addChartSection(section: AnalysisExportChartSection) {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(BODY_TEXT);
    doc.text(section.title, PAGE_MARGIN, y);
    y += 5.5;

    // Descrição do gráfico, igual à que aparece no cartão da tela.
    doc.setFont("helvetica", "normal");
    paragraph(section.description, 9.5, MUTED_TEXT, 4.3);
    y += 3;

    if (!section.hasChart) {
      doc.setFontSize(10);
      doc.setTextColor(MUTED_TEXT);
      doc.text(section.emptyText, PAGE_MARGIN, y);
      y += 10;
      return;
    }

    const imgURI = await captureChart(section.id);
    if (!imgURI) {
      doc.setFontSize(10);
      doc.setTextColor(MUTED_TEXT);
      doc.text("Não foi possível capturar este gráfico.", PAGE_MARGIN, y);
      y += 10;
      return;
    }

    const { width, height } = await loadImageSize(imgURI);
    const renderWidth = CONTENT_WIDTH;
    const renderHeight = (height / width) * renderWidth;
    ensureSpace(renderHeight + 6);
    doc.addImage(imgURI, "PNG", PAGE_MARGIN, y, renderWidth, renderHeight);
    y += renderHeight + 5;

    // O eixo do gráfico mostra só o código da natureza; sem esta legenda o
    // PDF fica ilegível para quem não decorou os códigos.
    if (section.natureLegend?.length) {
      const legendText = `Legenda das naturezas: ${section.natureLegend
        .map((item) => `${item.code} — ${item.name}`)
        .join("; ")}.`;
      paragraph(legendText, 9, MUTED_TEXT, 4);
    }
    y += 5;
  }

  for (const section of summary.chartSections) {
    await addChartSection(section);
  }

  async function addShareChart(section: AnalysisExportShareChart) {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(BODY_TEXT);
    doc.text(section.title, PAGE_MARGIN, y);
    y += 5.5;
    doc.setFont("helvetica", "normal");
    paragraph(section.description, 9.5, MUTED_TEXT, 4.3);
    y += 3;

    if (!section.data) {
      doc.setFontSize(10);
      doc.setTextColor(MUTED_TEXT);
      doc.text(section.emptyText, PAGE_MARGIN, y);
      y += 10;
      return;
    }

    const imgURI = await captureChart(section.id);
    if (!imgURI) {
      doc.setFontSize(10);
      doc.setTextColor(MUTED_TEXT);
      doc.text("Não foi possível capturar este gráfico.", PAGE_MARGIN, y);
      y += 10;
      return;
    }

    const { width, height } = await loadImageSize(imgURI);
    const renderWidth = 65;
    const renderHeight = (height / width) * renderWidth;
    ensureSpace(renderHeight + 6);
    doc.addImage(imgURI, "PNG", PAGE_MARGIN, y, renderWidth, renderHeight);

    const textX = PAGE_MARGIN + renderWidth + 8;
    const textWidth = CONTENT_WIDTH - renderWidth - 8;
    const noteLines = doc.splitTextToSize(section.data.note, textWidth);
    doc.setFontSize(10.5);
    doc.setTextColor(BODY_TEXT);
    doc.text(
      [
        `${section.data.meLabel}: ${section.data.meValue}`,
        `${section.data.othersLabel}: ${section.data.othersValue}`,
        "",
        ...noteLines,
      ],
      textX,
      y + 6,
    );
    y += renderHeight + 8;
  }

  for (const section of summary.shareCharts) {
    await addShareChart(section);
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFontSize(9);
    doc.setTextColor(140);
    doc.text(`Página ${page} de ${pageCount}`, PAGE_WIDTH - PAGE_MARGIN, PAGE_HEIGHT - 10, { align: "right" });
  }

  const slug = summary.municipalityName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  doc.save(`indicadores-${summary.year}-${slug}.pdf`);
}
