import type { Metadata } from "next";
import { MunicipalityDetailView } from "@/features/dashboard/gestor-publico/MunicipalityDetailView";
import { DETAIL_YEARS, loadMunicipalityDetailData } from "@/features/dashboard/gestor-publico/municipality-detail-data";

export const metadata: Metadata = { title: "Detalhe do município | Gestor Público | Compras Abertas" };

export default async function GestorMunicipioDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const requested = Number(query.ano);
  const year = DETAIL_YEARS.includes(requested) ? requested : DETAIL_YEARS[0];
  const data = await loadMunicipalityDetailData(id, year);
  return <MunicipalityDetailView data={data} />;
}
