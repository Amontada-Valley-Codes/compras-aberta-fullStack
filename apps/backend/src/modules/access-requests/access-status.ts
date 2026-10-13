import type { AccessRequestStatus } from "./access-request.schema";

interface UserWithAccessRequest {
  role: string;
  accessRequest?: { status: AccessRequestStatus } | null;
}

// Quem decide se o usuário pode usar a área restrita:
// - ADMIN não passa por solicitação, então está sempre liberado;
// - BUSINESS segue a situação da sua solicitação de acesso;
// - BUSINESS sem solicitação só existe para contas criadas antes do fluxo de
//   aprovação (pelo antigo POST /users); elas continuam liberadas.
function resolveAccessStatus(user: UserWithAccessRequest): AccessRequestStatus {
  if (user.role === "ADMIN") {
    return "APPROVED";
  }

  return user.accessRequest?.status ?? "APPROVED";
}

export { resolveAccessStatus };
