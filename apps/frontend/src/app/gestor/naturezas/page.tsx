import type { Metadata } from "next";
import { GestorPublicoNaturezas } from "@/features/dashboard/gestor-publico/GestorPublicoViews";

export const metadata: Metadata = { title: "Naturezas da despesa | Gestor Público | Compras Abertas" };

export default function GestorNaturezasPage() {
  return <GestorPublicoNaturezas />;
}
