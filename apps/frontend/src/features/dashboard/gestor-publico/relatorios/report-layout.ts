// Template de exportação do relatório, independente do formato.
//
// Distribui a capa, as seções e os blocos numa folha A4 (medidas em mm, fontes
// em pt) e desenha por meio de uma "superfície". O PDF (jsPDF) e o PNG
// (canvas) são superfícies; um formato novo só precisa implementar a
// interface abaixo. Sem acesso ao DOM: roda no navegador e em scripts.

import type { ReportBlock, ReportDocument, ReportKpi, ReportSection } from "./report-document";

export interface TextStyle {
  size: number;
  bold?: boolean;
  color: string;
}

export interface BoxStyle {
  fill?: string;
  stroke?: string;
  lineWidth?: number;
  radius?: number;
}

export interface ReportImage {
  // data URL (PDF) e, no navegador, o próprio elemento (canvas).
  src: string;
  width: number;
  height: number;
  element?: CanvasImageSource;
}

export type TextAlign = "left" | "right" | "center";

export interface Surface {
  // Paginado (PDF) quebra em folhas A4; não paginado (PNG) cresce para baixo.
  readonly paginated: boolean;
  measure(text: string, style: TextStyle): number;
  // y é a linha de base do texto.
  text(text: string, x: number, y: number, style: TextStyle, align?: TextAlign): void;
  box(x: number, y: number, width: number, height: number, style: BoxStyle): void;
  line(x1: number, y1: number, x2: number, y2: number, color: string, width: number): void;
  image(image: ReportImage, x: number, y: number, width: number, height: number): void;
  addPage(): void;
  pageCount(): number;
  goToPage(page: number): void;
}

export interface LayoutOptions {
  logo?: ReportImage | null;
  // Formatos de imagem mostram só as primeiras linhas das listas longas.
  maxTableRows?: number;
  fullListFormat?: string;
}

export const PAGE_WIDTH = 210;
export const PAGE_HEIGHT = 297;
const MARGIN = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const RIGHT = MARGIN + CONTENT_WIDTH;
const NEXT_PAGE_TOP = 21;
const CONTENT_BOTTOM = PAGE_HEIGHT - 21;
const PT = 0.3528;
const BLOCK_GAP = 4.5;

// Identidade do Compras Abertas (design-system/tokens.ts).
export const REPORT_COLORS = {
  institutional: "#123B5D",
  primary: "#2563A6",
  gold: "#D9A441",
  graphite: "#25313C",
  muted: "#5B6E7D",
  faint: "#8496A3",
  line: "#DCE5EC",
  soft: "#EAF3F8",
  zebra: "#F5F8FA",
  track: "#E4ECF2",
  note: "#FBF6EA",
  bandText: "#D3E2EE",
  white: "#FFFFFF",
} as const;
const C = REPORT_COLORS;

const lineHeight = (style: TextStyle) => style.size * PT * 1.32;
const baseline = (top: number, style: TextStyle, index = 0) => top + index * lineHeight(style) + style.size * PT * 0.95;

export function formatGeneratedAt(iso: string): string {
  return new Date(iso)
    .toLocaleString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    .replace(", ", " às ");
}

export function layoutReport(report: ReportDocument, surface: Surface, options: LayoutOptions = {}): { height: number } {
  let y = MARGIN;
  const generatedAt = formatGeneratedAt(report.generatedAt);

  // ---------- Texto ----------
  const fits = (text: string, width: number, style: TextStyle) => surface.measure(text, style) <= width;

  function breakWord(word: string, width: number, style: TextStyle): string[] {
    const parts: string[] = [];
    let current = "";
    for (const char of word) {
      if (current && !fits(current + char, width, style)) {
        parts.push(current);
        current = char;
      } else {
        current += char;
      }
    }
    if (current) parts.push(current);
    return parts;
  }

  function wrap(text: string, width: number, style: TextStyle, maxLines = Infinity): string[] {
    const lines: string[] = [];
    let current = "";
    for (const word of text.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (fits(candidate, width, style)) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      if (fits(word, width, style)) {
        current = word;
      } else {
        const parts = breakWord(word, width, style);
        lines.push(...parts.slice(0, -1));
        current = parts[parts.length - 1] ?? "";
      }
    }
    if (current) lines.push(current);
    if (lines.length <= maxLines) return lines.length ? lines : [""];
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last && !fits(`${last}…`, width, style)) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last.trimEnd()}…`;
    return kept;
  }

  function drawLines(lines: string[], x: number, top: number, style: TextStyle, align: TextAlign = "left", width = 0) {
    const anchor = align === "right" ? x + width : align === "center" ? x + width / 2 : x;
    lines.forEach((line, index) => surface.text(line, anchor, baseline(top, style, index), style, align));
  }

  // ---------- Paginação ----------
  function ensure(height: number) {
    if (surface.paginated && y + height > CONTENT_BOTTOM) {
      surface.addPage();
      y = NEXT_PAGE_TOP;
    }
  }

  // ---------- Capa ----------
  function drawCover() {
    const logoHeight = 11;
    if (options.logo) {
      surface.image(options.logo, MARGIN, y, (logoHeight * options.logo.width) / options.logo.height, logoHeight);
    } else {
      surface.text("Compras Abertas", MARGIN, y + 7.5, { size: 17, bold: true, color: C.institutional });
    }
    surface.text("PAINEL DO GESTOR PÚBLICO", RIGHT, y + 4, { size: 7.2, bold: true, color: C.faint }, "right");
    surface.text(`Gerado em ${generatedAt}`, RIGHT, y + 8.6, { size: 8, color: C.muted }, "right");
    y += logoHeight + 6;

    const pad = 7.5;
    const eyebrow = { size: 7.6, bold: true, color: C.gold };
    const title = { size: 21, bold: true, color: C.white };
    const summary = { size: 9.6, color: C.bandText };
    const titleLines = wrap(report.title, CONTENT_WIDTH - pad * 2, title);
    const summaryLines = wrap(report.summary, CONTENT_WIDTH - pad * 2, summary);
    const bandHeight = pad + lineHeight(eyebrow) + 2.5 + titleLines.length * lineHeight(title) + 2 + summaryLines.length * lineHeight(summary) + pad;
    surface.box(MARGIN, y, CONTENT_WIDTH, bandHeight, { fill: C.institutional, radius: 3 });
    surface.box(MARGIN + pad, y + bandHeight - 2.2, 18, 1, { fill: C.gold });
    let top = y + pad;
    drawLines([`RELATÓRIO · ${report.municipality.toLocaleUpperCase("pt-BR")}/${report.state} · ${report.year}`], MARGIN + pad, top, eyebrow);
    top += lineHeight(eyebrow) + 2.5;
    drawLines(titleLines, MARGIN + pad, top, title);
    top += titleLines.length * lineHeight(title) + 2;
    drawLines(summaryLines, MARGIN + pad, top, summary);
    y += bandHeight + 4.5;

    const meta: Array<[string, string]> = [
      ["Município", `${report.municipality}/${report.state}`],
      ["Período", report.period],
      ["Natureza da despesa", report.nature],
    ];
    const gap = 4;
    const width = (CONTENT_WIDTH - gap * (meta.length - 1)) / meta.length;
    const label = { size: 6.8, bold: true, color: C.faint };
    const value = { size: 9.2, bold: true, color: C.graphite };
    const cells = meta.map(([name, text]) => ({ name: name.toLocaleUpperCase("pt-BR"), lines: wrap(text, width - 8, value) }));
    const height = 4 + lineHeight(label) + 1.2 + Math.max(...cells.map((cell) => cell.lines.length)) * lineHeight(value) + 3.6;
    cells.forEach((cell, index) => {
      const x = MARGIN + index * (width + gap);
      surface.box(x, y, width, height, { fill: C.soft, radius: 2 });
      drawLines([cell.name], x + 4, y + 4, label);
      drawLines(cell.lines, x + 4, y + 4 + lineHeight(label) + 1.2, value);
    });
    y += height + 9;
  }

  // ---------- Seções e blocos ----------
  function drawSection(section: ReportSection) {
    const title = { size: 13, bold: true, color: C.institutional };
    const description = { size: 8.6, color: C.muted };
    const descriptionLines = section.description ? wrap(section.description, CONTENT_WIDTH - 4, description) : [];
    const headHeight = lineHeight(title) + (descriptionLines.length ? 0.8 + descriptionLines.length * lineHeight(description) : 0) + 4;
    // O título nunca fica sozinho no pé da página.
    ensure(headHeight + 28);
    surface.box(MARGIN, y + 0.9, 1.3, lineHeight(title) - 1.8, { fill: C.gold });
    drawLines([section.title], MARGIN + 4, y, title);
    if (descriptionLines.length) drawLines(descriptionLines, MARGIN + 4, y + lineHeight(title) + 0.8, description);
    y += headHeight;
    section.blocks.forEach((block, index) => {
      // A nota explica o bloco de cima: o fim do bloco desce junto com ela
      // para a nota não abrir a página seguinte sozinha.
      const next = section.blocks[index + 1];
      const keepWithNext = next?.kind === "note" ? BLOCK_GAP + noteHeight(next.text) : 0;
      drawBlock(block, keepWithNext);
      if (next) y += BLOCK_GAP;
    });
    y += 10;
  }

  function drawBlock(block: ReportBlock, keepWithNext: number) {
    if (block.kind === "kpis") drawKpis(block.items, keepWithNext);
    else if (block.kind === "table") drawTable(block, keepWithNext);
    else if (block.kind === "bars") drawBars(block, keepWithNext);
    else drawNote(block.text);
  }

  function drawBlockTitle(text: string, nextHeight: number) {
    const style = { size: 9.4, bold: true, color: C.graphite };
    ensure(lineHeight(style) + 2 + nextHeight);
    drawLines([text], MARGIN, y, style);
    y += lineHeight(style) + 2;
  }

  function drawEmpty(text: string) {
    const style = { size: 8.2, color: C.muted };
    const lines = wrap(text, CONTENT_WIDTH - 10, style);
    const height = lines.length * lineHeight(style) + 8;
    ensure(height);
    surface.box(MARGIN, y, CONTENT_WIDTH, height, { fill: C.zebra, stroke: C.line, lineWidth: 0.2, radius: 2 });
    drawLines(lines, MARGIN + 5, y + 4, style, "center", CONTENT_WIDTH - 10);
    y += height;
  }

  function drawKpis(items: ReportKpi[], keepWithNext: number) {
    if (!items.length) return;
    const columns = items.length === 4 || items.length === 2 ? 2 : Math.min(3, items.length);
    const gap = 4;
    const pad = 4;
    const width = (CONTENT_WIDTH - gap * (columns - 1)) / columns;
    const inner = width - pad * 2 - 1;
    const label = { size: 7.2, bold: true, color: C.muted };
    const detail = { size: 7.4, color: C.muted };

    for (let start = 0; start < items.length; start += columns) {
      const cards = items.slice(start, start + columns).map((item) => {
        let size = 14;
        while (size > 9 && !fits(item.value, inner, { size, bold: true, color: C.institutional })) size -= 0.5;
        const value = { size, bold: true, color: C.institutional };
        return {
          labelLines: wrap(item.label.toLocaleUpperCase("pt-BR"), inner, label),
          value,
          valueLines: wrap(item.value, inner, value, 2),
          detailLines: item.detail ? wrap(item.detail, inner, detail, 3) : [],
        };
      });
      const height = Math.max(
        ...cards.map(
          (card) =>
            pad +
            card.labelLines.length * lineHeight(label) +
            1.6 +
            card.valueLines.length * lineHeight(card.value) +
            (card.detailLines.length ? 0.8 + card.detailLines.length * lineHeight(detail) : 0) +
            pad,
        ),
      );
      ensure(height + (start + columns >= items.length ? keepWithNext : 0));
      cards.forEach((card, index) => {
        const x = MARGIN + index * (width + gap);
        surface.box(x, y, width, height, { fill: C.zebra, stroke: C.line, lineWidth: 0.2, radius: 2 });
        surface.box(x, y + 3, 1, height - 6, { fill: C.primary });
        let top = y + pad;
        drawLines(card.labelLines, x + pad + 1, top, label);
        top += card.labelLines.length * lineHeight(label) + 1.6;
        drawLines(card.valueLines, x + pad + 1, top, card.value);
        top += card.valueLines.length * lineHeight(card.value) + 0.8;
        drawLines(card.detailLines, x + pad + 1, top, detail);
      });
      y += height + (start + columns < items.length ? gap : 0);
    }
  }

  function drawTable(block: Extract<ReportBlock, { kind: "table" }>, keepWithNext: number) {
    const header = { size: 7.2, bold: true, color: C.white };
    const body = { size: 7.8, color: C.graphite };
    const totalStyle = { size: 7.8, bold: true, color: C.graphite };
    const padX = 1.8;
    const padY = 1.7;
    const sum = block.columns.reduce((total, column) => total + column.width, 0);
    const widths = block.columns.map((column) => (column.width / sum) * CONTENT_WIDTH);
    const lefts = widths.map((_, index) => MARGIN + widths.slice(0, index).reduce((total, width) => total + width, 0));

    const measureRow = (cells: string[], style: TextStyle) => {
      const lines = cells.map((cell, index) => wrap(cell, widths[index] - padX * 2, style));
      return { lines, height: Math.max(...lines.map((cell) => cell.length)) * lineHeight(style) + padY * 2 };
    };
    const drawRow = (row: ReturnType<typeof measureRow>, style: TextStyle) => {
      row.lines.forEach((lines, index) => {
        drawLines(lines, lefts[index] + padX, y + padY, style, block.columns[index].align ?? "left", widths[index] - padX * 2);
      });
    };

    const head = measureRow(block.columns.map((column) => column.label), header);
    const drawHead = () => {
      surface.box(MARGIN, y, CONTENT_WIDTH, head.height, { fill: C.institutional });
      drawRow(head, header);
      y += head.height;
    };

    if (block.title) drawBlockTitle(block.title, head.height + 8);
    if (!block.rows.length) {
      drawEmpty(block.emptyText);
      return;
    }

    const limit = options.maxTableRows ?? Infinity;
    const rows = block.rows.slice(0, limit);
    const capped = rows.length < block.rows.length;
    const total = block.total && !capped ? measureRow(block.total, totalStyle) : null;
    // O que precisa ficar na mesma página da última linha.
    const tail = (total?.height ?? 0) + (capped ? 3 + noteHeight(cappedText(rows.length, block.rows.length)) : 0) + keepWithNext;
    const first = measureRow(rows[0], body);
    ensure(head.height + first.height + (rows.length === 1 ? tail : 0));
    drawHead();

    rows.forEach((cells, index) => {
      const row = index === 0 ? first : measureRow(cells, body);
      const needed = row.height + (index === rows.length - 1 ? tail : 0);
      if (surface.paginated && y + needed > CONTENT_BOTTOM) {
        surface.addPage();
        y = NEXT_PAGE_TOP;
        drawHead();
      }
      if (index % 2 === 1) surface.box(MARGIN, y, CONTENT_WIDTH, row.height, { fill: C.zebra });
      drawRow(row, body);
      surface.line(MARGIN, y + row.height, RIGHT, y + row.height, C.line, 0.15);
      y += row.height;
    });

    if (total) {
      surface.box(MARGIN, y, CONTENT_WIDTH, total.height, { fill: C.soft });
      surface.line(MARGIN, y, RIGHT, y, C.primary, 0.35);
      drawRow(total, totalStyle);
      y += total.height;
    }

    if (capped) {
      y += 3;
      drawNote(cappedText(rows.length, block.rows.length));
    }
  }

  function cappedText(shown: number, total: number) {
    return (
      `Mostrando as ${shown.toLocaleString("pt-BR")} primeiras de ${total.toLocaleString("pt-BR")} linhas.` +
      (options.fullListFormat ? ` A lista completa está no arquivo ${options.fullListFormat}.` : "")
    );
  }

  function drawBars(block: Extract<ReportBlock, { kind: "bars" }>, keepWithNext: number) {
    const label = { size: 7.9, color: C.graphite };
    const value = { size: 7.9, bold: true, color: C.graphite };
    const max = Math.max(0, ...block.items.map((item) => item.value));
    if (block.title) drawBlockTitle(block.title, 10);
    if (!block.items.length || max <= 0) {
      drawEmpty(block.emptyText);
      return;
    }
    const labelWidth = 66;
    const valueWidth = 32;
    const trackX = MARGIN + labelWidth + 3;
    const trackWidth = CONTENT_WIDTH - labelWidth - valueWidth - 6;
    const barHeight = 3.2;

    block.items.forEach((item, index) => {
      const lines = wrap(item.label, labelWidth, label, 2);
      const height = Math.max(lines.length * lineHeight(label), 4.6) + 2.6;
      ensure(height + (index === block.items.length - 1 ? keepWithNext : 0));
      drawLines(lines, MARGIN, y + (height - lines.length * lineHeight(label)) / 2, label);
      const barY = y + (height - barHeight) / 2;
      surface.box(trackX, barY, trackWidth, barHeight, { fill: C.track, radius: barHeight / 2 });
      if (item.value > 0) {
        surface.box(trackX, barY, Math.max(barHeight, (item.value / max) * trackWidth), barHeight, { fill: C.primary, radius: barHeight / 2 });
      }
      drawLines([item.display], RIGHT - valueWidth, y + (height - lineHeight(value)) / 2, value, "right", valueWidth);
      y += height;
    });
  }

  const noteStyle = { size: 7.6, color: C.muted };
  const noteLines = (text: string) => wrap(text, CONTENT_WIDTH - 9, noteStyle);
  const noteHeight = (text: string) => noteLines(text).length * lineHeight(noteStyle) + 5;

  function drawNote(text: string) {
    const style = noteStyle;
    const lines = noteLines(text);
    const height = noteHeight(text);
    ensure(height);
    surface.box(MARGIN, y, CONTENT_WIDTH, height, { fill: C.note, radius: 1.5 });
    surface.box(MARGIN, y, 1.1, height, { fill: C.gold });
    drawLines(lines, MARGIN + 5, y + 2.5, style);
    y += height;
  }

  // ---------- Cabeçalho e rodapé ----------
  const footerStyle = { size: 6.8, color: C.muted };
  const footerLines = [`Fonte: ${report.source}.`, `Gerado em ${generatedAt} pelo Compras Abertas.`];

  function drawFooter(top: number, page?: { number: number; total: number }) {
    surface.line(MARGIN, top, RIGHT, top, C.line, 0.25);
    drawLines(footerLines, MARGIN, top + 2.2, footerStyle);
    if (page) {
      surface.text(`Página ${page.number} de ${page.total}`, RIGHT, baseline(top + 2.2, footerStyle), { size: 7, bold: true, color: C.graphite }, "right");
    }
  }

  function drawPageHeader() {
    const style = { size: 7, color: C.muted };
    surface.text("COMPRAS ABERTAS", MARGIN, 11.5, { size: 7, bold: true, color: C.primary });
    surface.text(`${report.title} · ${report.municipality}/${report.state} · ${report.year}`, RIGHT, 11.5, style, "right");
    surface.line(MARGIN, 14, RIGHT, 14, C.line, 0.25);
  }

  drawCover();
  report.sections.forEach(drawSection);

  if (surface.paginated) {
    const total = surface.pageCount();
    for (let page = 1; page <= total; page += 1) {
      surface.goToPage(page);
      if (page > 1) drawPageHeader();
      drawFooter(PAGE_HEIGHT - 15, { number: page, total });
    }
    return { height: PAGE_HEIGHT };
  }

  // Imagem: o rodapé fecha o conteúdo, sem paginação.
  y += 2;
  drawFooter(y);
  return { height: y + 2.2 + footerLines.length * lineHeight(footerStyle) + MARGIN - 4 };
}
