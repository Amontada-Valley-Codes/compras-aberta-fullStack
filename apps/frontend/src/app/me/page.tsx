import type { Metadata } from "next";
import { MeDashboard } from "@/features/dashboard/MeDashboard";

export const metadata: Metadata = {
  title: "Área da Microempresa | Compras Abertas",
};

export default async function MicroempresaPage({
  searchParams,
}: {
  searchParams: Promise<{ oportunidade?: string }>;
}) {
  const params = await searchParams;
  return <MeDashboard initialOpportunityId={params.oportunidade} />;
}
