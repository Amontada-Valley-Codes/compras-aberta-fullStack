import { redirect } from "next/navigation";

// O cadastro de ME agora faz parte do cadastro único (/auth/cadastro).
export default function CadastroMEPage() {
  redirect("/auth/cadastro?perfil=me");
}
