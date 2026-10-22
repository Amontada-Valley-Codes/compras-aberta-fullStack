import type { Metadata } from "next";
import { GestorPublicoMunicipios } from "@/features/dashboard/gestor-publico/GestorPublicoViews";

export const metadata: Metadata = { title: "Municípios | Gestor Público | Compras Abertas" };

export default function GestorMunicipiosPage() {
  return <GestorPublicoMunicipios />;
}
