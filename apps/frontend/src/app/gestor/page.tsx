import type { Metadata } from "next";
import { GestorPublicoDashboard } from "@/features/dashboard/gestor-publico/GestorPublicoViews";

export const metadata: Metadata = { title: "Visão geral do Gestor Público | Compras Abertas" };

export default function GestorPage() {
  return <GestorPublicoDashboard />;
}
