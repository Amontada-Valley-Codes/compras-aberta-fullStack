import type { Metadata } from "next";
import { GestorPublicoFornecedores } from "@/features/dashboard/gestor-publico/GestorPublicoViews";

export const metadata: Metadata = { title: "Fornecedores | Gestor Público | Compras Abertas" };

export default function GestorPublicoFornecedoresPage() {
  return <GestorPublicoFornecedores />;
}
