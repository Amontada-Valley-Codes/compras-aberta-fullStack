import type { FastifyReply, FastifyRequest } from "fastify";
import { verify } from "jsonwebtoken";

import { authConfig } from "../configs/auth";
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

  // O JWT sozinho não reflete desativação nem troca de papel; o banco é a
  // fonte de verdade.
  const user = await userRepository.findById(payload.sub);

  if (!user || !user.isActive) {
    throw new AppError("Invalid JWT token", 401);
  }

  request.user = { id: user.id, role: user.role };
}

export { ensureAuthenticated };
