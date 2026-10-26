import type { Metadata } from "next";
import { GestorPublicoDashboard } from "@/features/dashboard/gestor-publico/GestorPublicoViews";
import { loadCearaMap } from "@/features/dashboard/gestor/geo-api";

export const metadata: Metadata = { title: "Visão geral do Gestor Público | Compras Abertas" };

export default async function GestorPage() {
  const cearaMap = await loadCearaMap().catch(() => undefined);
  return <GestorPublicoDashboard cearaMap={cearaMap} />;
}
