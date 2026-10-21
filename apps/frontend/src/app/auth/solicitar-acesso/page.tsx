import { redirect } from "next/navigation";

// A solicitação de acesso agora faz parte do cadastro único (/auth/cadastro).
export default function AccessRequestPage() {
  redirect("/auth/cadastro");
}
