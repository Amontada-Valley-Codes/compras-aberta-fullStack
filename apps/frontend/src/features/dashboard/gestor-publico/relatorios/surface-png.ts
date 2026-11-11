import type { ReportDocument } from "./report-document";
import { layoutReport, PAGE_WIDTH, type ReportImage, type Surface, type TextStyle } from "./report-layout";

// Imagem PNG do relatório: o mesmo template do PDF numa folha contínua, sem
// paginação. O layout é calculado primeiro (guardando cada desenho) e só
// depois o canvas é criado, já com a altura total, para nada ficar cortado.

// ~200 dpi na largura de uma A4: legível em tela cheia e em mensagens.
const PX_PER_MM = 8;
// Limites de canvas dos navegadores (o Safari aceita no máximo ~16,7 mi de
// pixels por canvas; o Chrome, 32.767 px de altura).
const MAX_HEIGHT_PX = 32_000;
const MAX_AREA_PX = 16_700_000;
const MAX_TABLE_ROWS = 40;
const PT = 0.3528;
const FONT_FAMILY = "Helvetica, Arial, sans-serif";
const SERIF_FONT_FAMILY = "Georgia, 'Times New Roman', serif";

type Draw = (ctx: CanvasRenderingContext2D, scale: number) => void;

const font = (style: TextStyle, scale: number) => `${style.bold ? 700 : 400} ${style.size * PT * scale}px ${style.fontFamily === "serif" ? SERIF_FONT_FAMILY : FONT_FAMILY}`;

function roundedPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  if (radius > 0 && typeof ctx.roundRect === "function") ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
}

export async function renderPng(report: ReportDocument, assets: { logo: ReportImage | null }): Promise<Blob> {
  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");
  if (!measureContext) throw new Error("Canvas indisponível neste navegador.");
  const MEASURE_SCALE = 10;
  const draws: Draw[] = [];

  const surface: Surface = {
    paginated: false,
    measure(text, style) {
      measureContext.font = font(style, MEASURE_SCALE);
      return measureContext.measureText(text).width / MEASURE_SCALE;
    },
    text(text, x, y, style, align = "left") {
      draws.push((ctx, scale) => {
        ctx.font = font(style, scale);
        ctx.fillStyle = style.color;
        ctx.textAlign = align;
        ctx.textBaseline = "alphabetic";
        ctx.fillText(text, x * scale, y * scale);
      });
    },
    box(x, y, width, height, { fill, stroke, lineWidth = 0.2, radius = 0 }) {
      if (!fill && !stroke) return;
      draws.push((ctx, scale) => {
        roundedPath(ctx, x * scale, y * scale, width * scale, height * scale, Math.min(radius, width / 2, height / 2) * scale);
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fill();
        }
        if (stroke) {
          ctx.lineWidth = lineWidth * scale;
          ctx.strokeStyle = stroke;
          ctx.stroke();
        }
      });
    },
    line(x1, y1, x2, y2, color, width) {
      draws.push((ctx, scale) => {
        ctx.beginPath();
        ctx.moveTo(x1 * scale, y1 * scale);
        ctx.lineTo(x2 * scale, y2 * scale);
        ctx.lineWidth = width * scale;
        ctx.strokeStyle = color;
        ctx.stroke();
      });
    },
    image(image, x, y, width, height) {
      const element = image.element;
      if (!element) return;
      draws.push((ctx, scale) => ctx.drawImage(element, x * scale, y * scale, width * scale, height * scale));
    },
    addPage() {},
    pageCount: () => 1,
    goToPage() {},
  };

  const { height } = layoutReport(report, surface, { logo: assets.logo, maxTableRows: MAX_TABLE_ROWS, fullListFormat: "PDF" });
  const scale = Math.min(PX_PER_MM, MAX_HEIGHT_PX / height, Math.sqrt(MAX_AREA_PX / (PAGE_WIDTH * height)));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(PAGE_WIDTH * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível neste navegador.");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const draw of draws) draw(ctx, scale);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível gerar a imagem."))), "image/png");
  });
}
