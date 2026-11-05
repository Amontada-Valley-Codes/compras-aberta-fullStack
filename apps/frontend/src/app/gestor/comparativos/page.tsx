import type { Metadata } from "next";
import { GestorPublicoComparativos } from "@/features/dashboard/gestor-publico/GestorPublicoComparativos";

export const metadata: Metadata = { title: "Comparativos | Gestor Público | Compras Abertas" };

// ?municipios=ID,ID chega da tela de municípios ("Comparar selecionados").
export default async function GestorComparativosPage({
  searchParams,
}: {
  searchParams: Promise<{ municipios?: string | string[] }>;
}) {
  const { municipios } = await searchParams;
  const ids = (Array.isArray(municipios) ? municipios.join(",") : municipios ?? "").split(",").filter((id) => /^\d{7}$/.test(id));
  return <GestorPublicoComparativos initialMunicipalities={ids} />;
}
