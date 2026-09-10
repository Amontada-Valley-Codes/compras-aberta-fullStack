import type { FastifyReply, FastifyRequest } from "fastify";
import { verify } from "jsonwebtoken";

import { authConfig } from "../configs/auth";
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

  try {
    const { role, sub } = verify(token, authConfig.jwt.secret, {
      algorithms: ["HS256"],
    }) as TokenPayload;

    if (!sub || !role) {
      throw new Error("Invalid payload");
    }

    request.user = { id: sub, role };
  } catch {
    throw new AppError("Invalid JWT token", 401);
  }
}

export { ensureAuthenticated };
