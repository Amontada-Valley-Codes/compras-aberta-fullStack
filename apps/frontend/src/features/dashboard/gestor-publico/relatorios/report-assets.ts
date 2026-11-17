import type { ReportImage } from "./report-layout";

// Logo do cabeçalho dos arquivos. O PNG original tem muita margem
// transparente: recorta pelo conteúdo e reduz para um tamanho leve.
const LOGO_URL = "/logos/logo-horizontal.webp";
const LOGO_MAX_WIDTH = 900;

let logo: Promise<ReportImage | null> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível carregar o logo."));
    image.src = src;
  });
}

async function cropLogo(): Promise<ReportImage | null> {
  const image = await loadImage(LOGO_URL);
  const source = document.createElement("canvas");
  source.width = image.naturalWidth;
  source.height = image.naturalHeight;
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) return null;
  sourceContext.drawImage(image, 0, 0);

  const { data, width, height } = sourceContext.getImageData(0, 0, source.width, source.height);
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] < 24) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < left || bottom < top) return null;

  const cropWidth = right - left + 1;
  const cropHeight = bottom - top + 1;
  const scale = Math.min(1, LOGO_MAX_WIDTH / cropWidth);
  const output = document.createElement("canvas");
  output.width = Math.round(cropWidth * scale);
  output.height = Math.round(cropHeight * scale);
  output.getContext("2d")?.drawImage(source, left, top, cropWidth, cropHeight, 0, 0, output.width, output.height);
  return { src: output.toDataURL("image/png"), width: output.width, height: output.height, element: output };
}

// Sem o logo o relatório sai com o nome do sistema em texto.
export function loadReportLogo(): Promise<ReportImage | null> {
  logo ??= cropLogo().catch(() => {
    logo = null;
    return null;
  });
  return logo;
}
