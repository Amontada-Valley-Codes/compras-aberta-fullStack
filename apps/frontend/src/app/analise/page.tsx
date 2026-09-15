import type { Metadata } from "next";
import { MunicipalityAnalysisPage } from "@/features/analysis/MunicipalityAnalysisPage";

export const metadata: Metadata = {
  title: "Análise municipal | Compras Abertas",
};

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ municipio?: string; categoria?: string }>;
}) {
  const params = await searchParams;
  return (
    <MunicipalityAnalysisPage
      initialMunicipality={params.municipio ?? "Amontada"}
      initialCategory={params.categoria ?? "Alimentos"}
    />
  );
}
