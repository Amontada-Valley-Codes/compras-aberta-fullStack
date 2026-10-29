import { redirect } from "next/navigation";
import "@/features/dashboard/gestor-publico/gestor-publico.css";

export default function GestorPublicoLayout() {
  redirect("/gestor");
}
