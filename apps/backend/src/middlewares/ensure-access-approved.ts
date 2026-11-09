import type { FastifyReply, FastifyRequest } from "fastify";

import { AppError } from "../utils/AppError";

// Usar depois do ensureAuthenticated, nas rotas da área da empresa: só deixa
// passar quem teve a solicitação de acesso aprovada (ADMIN sempre passa).
async function ensureAccessApproved(
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  const user = request.user;
  if (user?.role === "ADMIN") return;

  const now = new Date();
  const hasActiveTrial =
    user?.subscriptionStatus === "trialing" &&
    user?.trialEndsAt &&
    new Date(user.trialEndsAt) > now;
  const hasActiveSubscription = user?.subscriptionStatus === "active";

  // Se tiver período de teste ativo ou assinatura ativa, o acesso é liberado
  if (hasActiveTrial || hasActiveSubscription) {
    return;
  }

  // Se o teste expirou
  if (
    user?.subscriptionStatus === "trialing" &&
    user?.trialEndsAt &&
    new Date(user.trialEndsAt) <= now
  ) {
    throw new AppError(
      "Seu período de teste de 7 dias expirou. Assine o plano para continuar utilizando a plataforma.",
      403,
    );
  }

  const accessStatus = request.user?.accessStatus;

  if (accessStatus === "PENDING") {
    throw new AppError("Sua solicitação de acesso ainda está em análise", 403);
  }

  if (accessStatus !== "APPROVED") {
    throw new AppError("Sua solicitação de acesso foi recusada", 403);
  }
}

export { ensureAccessApproved };
