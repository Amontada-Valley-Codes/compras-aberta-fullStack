import type { Metadata } from "next";
import { GestorDashboard } from "@/features/dashboard/GestorDashboard";
import { GestorMissingMunicipality } from "@/features/dashboard/gestor/GestorStates";
import { resolveGestorContext } from "@/features/dashboard/gestor/gestor-context";
import { loadGestorOverview } from "@/features/dashboard/gestor/gestor-data";

export const metadata: Metadata = {
  title: "Painel do Gestor Público | Compras Abertas",
};

export default async function GestorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await resolveGestorContext(searchParams);
  if (!context) return null;
  if (!context.municipality) return <GestorMissingMunicipality />;

  const data = await loadGestorOverview(context.municipality, context.year);
  return <GestorDashboard data={data} municipalityIbge={context.municipalityIbge} />;
}
