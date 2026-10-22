import type { Metadata } from "next";
import { GestorPublicoDiagnostico } from "@/features/dashboard/gestor-publico/GestorPublicoViews";

export const metadata: Metadata = { title: "Diagnóstico territorial | Gestor Público | Compras Abertas" };

export default function GestorPublicoDiagnosticoPage() {
  return <GestorPublicoDiagnostico />;
}
