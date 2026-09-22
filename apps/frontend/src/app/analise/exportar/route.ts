import { analysisPageSchema } from "@/schemas/analytics/analysis-page.schema";
import { formatCnpj } from "@/features/public-data/format";
import { loadAnalysisData, loadMunicipalityOptions, type AnalysisData } from "@/features/public-data/public-data";
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
    bid.nome_natureza,
    bid.empresa,
    formatCnpj(bid.cnpj),
    bid.porte_empresa,
    bid.endereco,
    numeric(bid.valor_total_licitacao),
    numeric(bid.valor_total_vencido),
    bid.quantidade_itens_vencidos,
  ];
}

function indicatorCsv(data: AnalysisData): string {
  const { filters, selectedMunicipality, micro, expenses, participation, local } = data;
  const rows: CsvValue[][] = [["Grupo", "Município", "Ano", "Filtro de natureza", "Código da natureza", "Natureza", "Indicador", "Valor", "Unidade", "Observação"]];
  const municipality = selectedMunicipality?.name ?? "Ceará";
  const natureFilter = filters.natureCode ?? "Todas";
  const add = (group: string, code: string, nature: string, indicator: string, value: string | number | null | undefined, unit = "", note = "") => {
    rows.push([group, municipality, filters.year, natureFilter, code, nature, indicator, numeric(value), unit, note]);
  };

  if (micro.data) {
    const summary = micro.data.data;
    add("Indicadores de ME", "", "", "Microempresas", summary.quantidade_microempresas, "empresas");
    add("Indicadores de ME", "", "", "Licitações com ME", summary.quantidade_licitacoes, "licitações");
    add("Indicadores de ME", "", "", "Participações de ME", summary.quantidade_participacoes, "participações");
    add("Indicadores de ME", "", "", "Valor vencido por ME", summary.valor_total_vencido, "R$");
    add("Indicadores de ME", "", "", "Itens vencidos por ME", summary.quantidade_itens_vencidos, "itens");
  }

  for (const item of expenses.data?.data ?? []) {
    const note = "Dotação não representa pagamento efetivo; o gráfico compara todas as naturezas.";
    add("Dotações por natureza", item.codigo_natureza, item.nome_natureza, "Valor total da dotação", item.valor_total_dotacao, "R$", note);
    add("Dotações por natureza", item.codigo_natureza, item.nome_natureza, "Quantidade de dotações", item.quantidade_dotacoes, "dotações", note);
    add("Dotações por natureza", item.codigo_natureza, item.nome_natureza, "Quantidade de licitações", item.quantidade_licitacoes, "licitações", note);
  }

  for (const item of participation.data?.data ?? []) {
    const group = "Participação de ME por natureza";
    const note = "Os gráficos por natureza comparam todas as naturezas.";
    add(group, item.codigo_natureza, item.nome_natureza, "Licitações", item.quantidade_licitacoes, "licitações", note);
    add(group, item.codigo_natureza, item.nome_natureza, "Licitações com ME", item.licitacoes_com_me, "licitações", note);
    add(group, item.codigo_natureza, item.nome_natureza, "Percentual de licitações com ME", item.percentual_licitacoes_com_me, "%", note);
    add(group, item.codigo_natureza, item.nome_natureza, "Participações", item.quantidade_participacoes, "participações", note);
    add(group, item.codigo_natureza, item.nome_natureza, "Participações de ME", item.participacoes_me, "participações", note);
    add(group, item.codigo_natureza, item.nome_natureza, "Percentual de participações de ME", item.percentual_participacoes_me, "%", note);
    add(group, item.codigo_natureza, item.nome_natureza, "Valor vencido total", item.valor_vencido, "R$", note);
    add(group, item.codigo_natureza, item.nome_natureza, "Valor vencido por ME", item.valor_vencido_me, "R$", note);
    add(group, item.codigo_natureza, item.nome_natureza, "Percentual do valor vencido por ME", item.percentual_valor_vencido_me, "%", note);
  }

  if (local.data) {
    const summary = local.data.resumo;
    const group = "Participação de ME locais";
    add(group, "", "", "Licitações totais", summary.total_licitacoes, "licitações");
    add(group, "", "", "Licitações com ME locais", summary.licitacoes_com_me_local, "licitações");
    add(group, "", "", "Percentual de licitações com ME locais", summary.percentual_licitacoes_com_me_local, "%");
    add(group, "", "", "Participações totais", summary.total_participacoes, "participações");
    add(group, "", "", "Participações de ME locais", summary.participacoes_me_locais, "participações");
    add(group, "", "", "Percentual de participações de ME locais", summary.percentual_participacoes_me_locais, "%");
    add(group, "", "", "Valor vencido total", summary.valor_total_vencido, "R$");
    add(group, "", "", "Valor vencido por ME locais", summary.valor_vencido_me_local, "R$");
    add(group, "", "", "Percentual do valor vencido por ME locais", summary.percentual_valor_vencido_me_local, "%");
  }

  return `\uFEFF${rows.map(csvLine).join("")}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("tipo");
  if (type !== "licitacoes" && type !== "indicadores") return new Response("Tipo de exportação inválido.", { status: 400 });

  const params = analysisPageSchema.parse(Object.fromEntries(url.searchParams));
  for (const key of ["municipio", "natureza", "ano"] as const) {
    if (url.searchParams.has(key) && params[key] == null) return new Response("Filtros inválidos.", { status: 400 });
  }
  const year = params.ano ?? new Date().getUTCFullYear();
  const filenameSuffix = `${year}${params.municipio ? `-${params.municipio}` : ""}${params.natureza ? `-${params.natureza}` : ""}`;

  if (type === "indicadores") {
    const data = await loadAnalysisData({ municipalityIbge: params.municipio, natureCode: params.natureza, year, page: 1, pageSize: 10 });
    if (params.municipio && !data.selectedMunicipality) return new Response("Município não encontrado.", { status: 400 });
    if (data.micro.error || data.expenses.error || data.participation.error || (params.municipio && data.local.error)) {
      return new Response("Não foi possível carregar todos os indicadores para exportação.", { status: 502 });
    }
    return new Response(indicatorCsv(data), { headers: downloadHeaders(`indicadores-${filenameSuffix}.csv`) });
  }

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
          controller.enqueue(encoder.encode(`\uFEFF${csvLine(["Licitação", "Ano", "Código do município", "Município", "Código da natureza", "Natureza", "Empresa", "CNPJ", "Porte", "Endereço", "Valor total da licitação (R$)", "Valor vencido (R$)", "Itens vencidos"])}`));
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
