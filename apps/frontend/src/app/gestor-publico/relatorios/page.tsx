import { redirect } from "next/navigation";

// /gestor-publico é o endereço antigo do painel: os relatórios ficam em /gestor.
export default function GestorPublicoRelatoriosPage() {
  redirect("/gestor/relatorios");
}
