import type { Metadata } from "next";
import { MunicipalityAnalysisPage } from "@/features/analysis/MunicipalityAnalysisPage";
import { loadAnalysisData } from "@/features/public-data/public-data";
import { analysisPageSchema } from "@/schemas/analytics/analysis-page.schema";

export const metadata: Metadata = {
  title: "Análise municipal | Compras Abertas",
};

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = analysisPageSchema.parse(await searchParams);
  const data = await loadAnalysisData({
    municipalityIbge: params.municipio,
    natureCode: params.natureza,
    year: params.ano ?? new Date().getUTCFullYear(),
    page: params.pagina ?? 1,
    pageSize: Number(params.limite ?? "10"),
  });
  return <MunicipalityAnalysisPage data={data} />;
}
