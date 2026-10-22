import type { Metadata } from "next";
import { GestorPublicoRelatorios } from "@/features/dashboard/gestor-publico/GestorPublicoViews";

export const metadata: Metadata = { title: "Relatórios | Gestor Público | Compras Abertas" };

export default function GestorPublicoRelatoriosPage() {
  return <GestorPublicoRelatorios />;
}
