import type { Metadata } from "next";
import { GestorPublicoComparativos } from "@/features/dashboard/gestor-publico/GestorPublicoViews";

export const metadata: Metadata = { title: "Comparativos | Gestor Público | Compras Abertas" };

export default function GestorPublicoComparativosPage() {
  return <GestorPublicoComparativos />;
}
