import type { AccessRequestStatus } from "./access-request.schema";

interface UserWithAccessRequest {
  role: string;
  accessRequest?: { status: AccessRequestStatus } | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: Date | null;
}

// Quem decide se o usuário pode usar a área restrita:
// - ADMIN não passa por solicitação, então está sempre liberado;
// - Se estiver no período de teste (7 dias) ou com assinatura ativa, está liberado ("APPROVED");
// - Caso contrário, segue a situação da sua solicitação de acesso.
function resolveAccessStatus(user: UserWithAccessRequest): AccessRequestStatus {
  if (user.role === "ADMIN") {
    return "APPROVED";
  }

  const now = new Date();
  const hasActiveTrial =
    user.subscriptionStatus === "trialing" &&
    user.trialEndsAt &&
    new Date(user.trialEndsAt) > now;
  const hasActiveSubscription = user.subscriptionStatus === "active";

  if (hasActiveTrial || hasActiveSubscription) {
    return "APPROVED";
  }

  return user.accessRequest?.status ?? "APPROVED";
}

export { resolveAccessStatus };
