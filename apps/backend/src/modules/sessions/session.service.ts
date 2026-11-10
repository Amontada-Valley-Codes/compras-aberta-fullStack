import { compare } from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { sign } from "jsonwebtoken";

import { prisma } from "../../lib/prisma";
import { authConfig } from "../../configs/auth";
import { AppError } from "../../utils/AppError";
import type { AccessRequestStatus } from "../access-requests/access-request.schema";
import { resolveAccessStatus } from "../access-requests/access-status";
import { userRepository } from "../users/user.repository";
import { refreshTokenRepository } from "./refresh-token.repository";
import type { CreateSessionDTO } from "./session.schema";

interface UserSessionData {
  id: string;
  role: string;
  accessRequest?: { status: AccessRequestStatus } | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: Date | null;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function validateAndSyncSubscriptionOnAccess(user: UserSessionData) {
  if (user.role === "ADMIN") {
    return;
  }

  const now = new Date();
  let status = user.subscriptionStatus ?? "trialing";
  let trialEndsAt = user.trialEndsAt;

  // Caso o usuário antigo não possua trialEndsAt preenchido, define 7 dias de teste
  if (status === "trialing" && !trialEndsAt) {
    trialEndsAt = new Date(now.getTime() + 7 * DAY_IN_MS);
    user.trialEndsAt = trialEndsAt;
    await prisma.user.update({
      where: { id: user.id },
      data: { trialEndsAt },
    });
  }

  // Se o período de teste grátis chegou ao fim, atualiza apenas o status para "expired" (sem excluir dados)
  if (status === "trialing" && trialEndsAt && new Date(trialEndsAt) <= now) {
    status = "expired";
    user.subscriptionStatus = "expired";
    await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionStatus: "expired" },
    });
  }

  if (status === "canceled") {
    throw new AppError(
      "Acesso bloqueado: sua assinatura foi cancelada. Seus dados permanecem preservados na plataforma.",
      403,
    );
  }

  if (status === "expired" || status === "trial_expired" || status === "unpaid") {
    throw new AppError(
      "Acesso bloqueado: seu período de avaliação gratuita de 7 dias expirou.",
      403,
    );
  }
}

async function issueTokens(user: UserSessionData) {
  // accessStatus vai no token para o frontend decidir a rota sem consultar o
  // backend; quem garante a restrição de verdade é o ensureAccessApproved.
  const payload = { role: user.role, accessStatus: resolveAccessStatus(user) };

  const token = sign(payload, authConfig.jwt.secret, {
    subject: user.id,
    expiresIn: authConfig.jwt.expiresIn,
    algorithm: "HS256",
  });

  const refreshToken = randomBytes(48).toString("base64url");

  await refreshTokenRepository.create({
    tokenHash: hashToken(refreshToken),
    userId: user.id,
    expiresAt: new Date(
      Date.now() + authConfig.refreshToken.expiresInDays * DAY_IN_MS,
    ),
  });

  return { token, refreshToken };
}

const sessionService = {
  async create({ email, password }: CreateSessionDTO) {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new AppError("E-mail ou senha incorretos.", 401);
    }

    const passwordMatched = await compare(password, user.password);

    if (!passwordMatched) {
      throw new AppError("E-mail ou senha incorretos.", 401);
    }

    if (!user.isActive) {
      throw new AppError("E-mail ou senha incorretos.", 401);
    }

    await validateAndSyncSubscriptionOnAccess(user);

    return issueTokens(user);
  },

  async refresh(refreshToken: string) {
    const stored = await refreshTokenRepository.findByHash(
      hashToken(refreshToken),
    );

    if (!stored) {
      throw new AppError("Refresh token inválido", 401);
    }

    if (stored.revokedAt) {
      await refreshTokenRepository.revokeAllByUser(stored.userId);
      throw new AppError("Refresh token inválido", 401);
    }

    if (stored.expiresAt <= new Date()) {
      throw new AppError("Refresh token expirado", 401);
    }

    const user = await userRepository.findById(stored.userId);

    if (!user || !user.isActive) {
      await refreshTokenRepository.revokeAllByUser(stored.userId);
      throw new AppError("Usuário desativado", 403);
    }

    try {
      await validateAndSyncSubscriptionOnAccess(user);
    } catch (err) {
      await refreshTokenRepository.revokeAllByUser(stored.userId);
      throw err;
    }

    const rotated = await refreshTokenRepository.revoke(stored.id);

    if (!rotated) {
      throw new AppError("Refresh token inválido", 401);
    }

    return issueTokens(user);
  },

  async logout(refreshToken: string) {
    const stored = await refreshTokenRepository.findByHash(
      hashToken(refreshToken),
    );

    if (stored) {
      await refreshTokenRepository.revoke(stored.id);
    }
  },
};

export { sessionService };
