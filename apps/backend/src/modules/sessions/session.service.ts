import { compare } from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { sign } from "jsonwebtoken";

import { authConfig } from "../../configs/auth";
import { AppError } from "../../utils/AppError";
import { userRepository } from "../users/user.repository";
import { refreshTokenRepository } from "./refresh-token.repository";
import type { CreateSessionDTO } from "./session.schema";

interface UserSessionData {
  id: string;
  role: string;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function issueTokens(user: UserSessionData) {
  const token = sign({ role: user.role }, authConfig.jwt.secret, {
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
      throw new AppError("E-mail ou senha inválidos", 401);
    }

    const passwordMatched = await compare(password, user.password);

    if (!passwordMatched) {
      throw new AppError("E-mail ou senha inválidos", 401);
    }

    if (!user.isActive) {
      if (user.role === "BUSINESS") {
        throw new AppError(
          "Sua solicitação cadastral ainda está em análise pelo administrador. Aguarde a aprovação para acessar a plataforma.",
          403,
        );
      }
      throw new AppError("Usuário desativado pelo administrador", 403);
    }

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
