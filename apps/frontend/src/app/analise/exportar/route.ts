import { analysisPageSchema } from "@/schemas/analytics/analysis-page.schema";
import { formatCnpj } from "@/features/public-data/format";
import { natureLabel, officialNatureName } from "@/features/public-data/plain-language";
import { loadMunicipalityOptions } from "@/features/public-data/public-data";
import { listDetailedBidsService } from "@/services/analytics/list-detailed-bids.service";
import type { DetailedBid, DetailedBidsQuery, DetailedBidsResponse } from "@/services/analytics/analytics.types";

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

function bidRow(bid: DetailedBid): CsvValue[] {
  return [
    bid.numero_licitacao,
    bid.ano_licitacao,
    bid.codigo_municipio,
    bid.municipio,
    bid.codigo_natureza,
    natureLabel(bid.codigo_natureza, bid.nome_natureza),
    officialNatureName(bid.nome_natureza),
    bid.empresa,
    formatCnpj(bid.cnpj),
    bid.porte_empresa,
    bid.endereco,
    numeric(bid.valor_total_licitacao),
    numeric(bid.valor_total_vencido),
    bid.quantidade_itens_vencidos,
  ];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("tipo");
  // Os indicadores/gráficos são exportados em PDF direto no navegador (veja
  // exportChartsToPdf, em features/analysis), então esta rota só serve a
  // lista completa de licitações.
  if (type !== "licitacoes") return new Response("Tipo de exportação inválido.", { status: 400 });

  const params = analysisPageSchema.parse(Object.fromEntries(url.searchParams));
  for (const key of ["municipio", "natureza", "ano"] as const) {
    if (url.searchParams.has(key) && params[key] == null) return new Response("Filtros inválidos.", { status: 400 });
  }
  const year = params.ano ?? new Date().getUTCFullYear();
  const filenameSuffix = `${year}${params.municipio ? `-${params.municipio}` : ""}${params.natureza ? `-${params.natureza}` : ""}`;

  let municipalityCode: string | undefined;
  if (params.municipio) {
    const municipalities = await loadMunicipalityOptions();
    if (!municipalities.data) return new Response("Não foi possível carregar os municípios.", { status: 502 });
    municipalityCode = municipalities.data.find((item) => item.ibgeCode === params.municipio)?.tceCode;
    if (!municipalityCode) return new Response("Município não encontrado.", { status: 400 });
  }

  const query: DetailedBidsQuery = { codigo_municipio: municipalityCode, codigo_natureza: params.natureza, ano: year, limit: 100, offset: 0 };
  let firstPage: DetailedBidsResponse;
  try {
    firstPage = await listDetailedBidsService(query);
  } catch {
    return new Response("Não foi possível carregar as licitações para exportação.", { status: 502 });
  }

  const encoder = new TextEncoder();
  let nextOffset = 0;
  let firstPending = true;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const page = firstPending ? firstPage : await listDetailedBidsService({ ...query, offset: nextOffset });
        if (firstPending) {
          controller.enqueue(encoder.encode(`\uFEFF${csvLine(["Licitação", "Ano", "Código do município", "Município", "Código do tipo de compra", "Tipo de compra", "Natureza da despesa (nome oficial)", "Empresa vencedora", "CNPJ", "Porte", "Endereço", "Valor total da licitação (R$)", "Valor ganho (R$)", "Itens ganhos"])}`));
          firstPending = false;
        }
        if (page.data.length) controller.enqueue(encoder.encode(page.data.map((bid) => csvLine(bidRow(bid))).join("")));
        if (page.data.length < 100) {
          controller.close();
        } else {
          nextOffset += 100;
        }
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, { headers: downloadHeaders(`licitacoes-${filenameSuffix}.csv`) });
}
