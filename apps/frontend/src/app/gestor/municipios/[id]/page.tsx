import type { Metadata } from "next";
import { GestorPublicoMunicipioDetail } from "@/features/dashboard/gestor-publico/GestorPublicoViews";

export const metadata: Metadata = { title: "Detalhe do município | Gestor Público | Compras Abertas" };

export default async function GestorMunicipioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GestorPublicoMunicipioDetail id={id} />;
}
