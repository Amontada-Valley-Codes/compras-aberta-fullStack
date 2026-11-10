import type { FastifyReply, FastifyRequest } from "fastify";
import { verify } from "jsonwebtoken";

import { authConfig } from "../configs/auth";
import { prisma } from "../lib/prisma";
import { resolveAccessStatus } from "../modules/access-requests/access-status";
import { userRepository } from "../modules/users/user.repository";
import { AppError } from "../utils/AppError";

interface TokenPayload {
  role: string;
  sub: string;
}

async function ensureAuthenticated(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    throw new AppError("JWT token not found", 401);
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new AppError("Invalid JWT token", 401);
  }

  let payload: TokenPayload;

  try {
    const { role, sub } = verify(token, authConfig.jwt.secret, {
      algorithms: ["HS256"],
    }) as TokenPayload;

    if (!sub || !role) {
      throw new Error("Invalid payload");
    }

    payload = { role, sub };
  } catch {
    throw new AppError("Invalid JWT token", 401);
  }

  // O JWT sozinho não reflete desativação, troca de papel nem a decisão da
  // solicitação de acesso; o banco é a fonte de verdade.
  const user = await userRepository.findById(payload.sub);

  if (!user || !user.isActive) {
    throw new AppError("Invalid JWT token", 401);
  }

  let subscriptionStatus = user.subscriptionStatus;
  let trialEndsAt = user.trialEndsAt;

  if (user.role !== "ADMIN") {
    const now = new Date();
    if (subscriptionStatus === "trialing" && trialEndsAt && new Date(trialEndsAt) <= now) {
      subscriptionStatus = "expired";
      user.subscriptionStatus = "expired";
      await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: "expired" },
      });
    }

    const isPaymentRoute = request.url.startsWith("/payments");
    if (
      !isPaymentRoute &&
      (subscriptionStatus === "canceled" ||
        subscriptionStatus === "expired" ||
        subscriptionStatus === "trial_expired")
    ) {
      throw new AppError(
        subscriptionStatus === "canceled"
          ? "Seu acesso está bloqueado porque sua assinatura foi cancelada."
          : "Seu período de teste gratuito expirou. Ative sua assinatura para continuar.",
        403,
      );
    }
  }

  request.user = {
    id: user.id,
    role: user.role,
    accessStatus: resolveAccessStatus(user),
    subscriptionStatus,
    trialEndsAt,
  };
}

export { ensureAuthenticated };
