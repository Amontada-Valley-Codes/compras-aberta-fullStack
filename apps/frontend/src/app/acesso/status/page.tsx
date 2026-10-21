import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AccessStatus } from "@/app/components/auth/access-status";
import { backendGetMyAccessRequest } from "@/lib/auth/backend-access-requests";
import { SESSION_COOKIE } from "@/lib/auth/session";
import type { AccessRequest } from "@/services/access-requests/access-requests.types";

export const metadata: Metadata = {
  title: "Status do acesso | Compras Abertas",
};

// O proxy.ts só deixa chegar aqui quem tem sessão com acesso pendente ou
// recusado; a situação exibida vem do backend (fonte de verdade), não do
// token, para refletir na hora uma decisão recém-tomada pelo administrador.
// Se o backend recusar o token, não redirecionamos para o login (o proxy
// devolveria a pessoa para cá): a tela mostra o erro e oferece "Sair".
export default async function AccessStatusPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  let accessRequest: AccessRequest | null = null;

  if (token) {
    try {
      accessRequest = await backendGetMyAccessRequest(token);
    } catch {
      accessRequest = null;
    }
  }

  return <AccessStatus accessRequest={accessRequest} />;
}
