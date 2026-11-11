import { analysisPageSchema } from "@/schemas/analytics/analysis-page.schema";
import { formatCnpj } from "@/features/public-data/format";
import { natureLabel, officialNatureName } from "@/features/public-data/plain-language";
import { loadMunicipalityOptions } from "@/features/public-data/public-data";
import { getPaymentsSummaryService, listPaymentSuppliersService } from "@/services/analytics/payments.service";

type CsvValue = string | number | null | undefined;

const csvCell = (value: CsvValue) => {
  const raw = String(value ?? "");
  const safe = /^[\s]*[=+@\-]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
};

const csvLine = (values: CsvValue[]) => `${values.map(csvCell).join(";")}\r\n`;
const numeric = (value: string | number | null | undefined) => value == null || value === "" || !Number.isFinite(Number(value))
  ? ""
  : Number(value).toLocaleString("pt-BR", { useGrouping: false, maximumFractionDigits: 4 });

const downloadHeaders = (filename: string) => ({
  "Content-Type": "text/csv; charset=utf-8",
  "Content-Disposition": `attachment; filename="${filename}"`,
  "Cache-Control": "no-store",
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("tipo");
  // Cada exportação conserva sua métrica e usa a operação correspondente.
  if (type !== "pagamentos") return new Response("Tipo de exportação inválido.", { status: 400 });

  const params = analysisPageSchema.parse(Object.fromEntries(url.searchParams));
  for (const key of ["municipio", "natureza", "ano"] as const) {
    if (url.searchParams.has(key) && params[key] == null) return new Response("Filtros inválidos.", { status: 400 });
  }
  const year = params.ano ?? new Date().getUTCFullYear();
  const filenameSuffix = `${year}${params.municipio ? `-${params.municipio}` : ""}${params.natureza ? `-${params.natureza}` : ""}`;

  if (!params.municipio) return new Response("Selecione um município.", { status: 400 });
  let municipalityCode: string | undefined;
  if (params.municipio) {
    const municipalities = await loadMunicipalityOptions();
    if (!municipalities.data) return new Response("Não foi possível carregar os municípios.", { status: 502 });
    municipalityCode = municipalities.data.find((item) => item.ibgeCode === params.municipio)?.tceCode;
    if (!municipalityCode) return new Response("Município não encontrado.", { status: 400 });
  }

  const query = { codigo_municipio: municipalityCode!.padStart(3, "0"), codigo_natureza: params.natureza, ano: year, limit: 100 };
  let collectionId: number;
  try {
    collectionId = (await getPaymentsSummaryService({ codigo_municipio: query.codigo_municipio, ano: year })).coleta.coleta_id;
  } catch {
    return new Response("Não foi possível carregar a coleta de pagamentos.", { status: 502 });
  }
  const headers = ["Código da natureza", "Tipo de compra", "Natureza da despesa (nome oficial)", "Fornecedor", "Documento", "Categoria de porte", "Valor pago (R$)", "Quantidade de pagamentos"];
  const loadRows = async (offset: number): Promise<CsvValue[][]> => {
    const page = await listPaymentSuppliersService({ ...query, coleta_id: collectionId, categoria_porte: "ME", offset });
    if (page.coleta_id !== collectionId) throw new Error("Coleta divergente na exportação");
    return page.data.map((row) => [row.codigo_natureza, natureLabel(row.codigo_natureza, row.nome_natureza), officialNatureName(row.nome_natureza), row.nome_negociante, formatCnpj(row.documento), row.categoria_porte, numeric(row.valor_pago), row.quantidade_pagamentos]);
  };
  let firstRows: CsvValue[][];
  try {
    firstRows = await loadRows(0);
  } catch {
    return new Response("Não foi possível carregar os dados para exportação.", { status: 502 });
  }
  const encoder = new TextEncoder();
  let nextOffset = 0;
  let firstPending = true;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const rows = firstPending ? firstRows : await loadRows(nextOffset);
        if (firstPending) {
          controller.enqueue(encoder.encode(`\uFEFF${csvLine(headers)}`));
          firstPending = false;
        }
        if (rows.length) controller.enqueue(encoder.encode(rows.map(csvLine).join("")));
        if (rows.length < 100) controller.close();
        else nextOffset += 100;
      } catch (error) {
        controller.error(error);
      }
    },
  });
  return new Response(stream, { headers: downloadHeaders(`${type}-${filenameSuffix}.csv`) });
}
