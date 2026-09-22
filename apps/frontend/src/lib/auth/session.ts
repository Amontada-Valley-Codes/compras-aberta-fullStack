import jwt from "jsonwebtoken";

// Nomes e validades precisam bater com o que o backend emite
// (apps/backend/src/configs/auth.ts) — o token é o mesmo JWT assinado lá.
export const SESSION_COOKIE = "session";
export const REFRESH_COOKIE = "refresh_token";
export const SESSION_MAX_AGE_SECONDS = 15 * 60;
export const REFRESH_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export interface SessionPayload {
  userId: string;
  role: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET não configurado no frontend. Use o mesmo valor definido em apps/backend/.env, " +
        "senão o front não consegue validar o token emitido pelo backend.",
    );
  }
  return secret;
}

// Checagem otimista (sem consultar o banco): só confirma que o token foi
// emitido pelo backend e ainda não expirou. Quem decide de verdade se a
// conta ainda pode agir é o backend, em cada chamada autenticada.
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
    if (typeof payload === "string" || !payload.sub || typeof payload.role !== "string") {
      return null;
    }
    return { userId: String(payload.sub), role: payload.role };
  } catch {
    return null;
  }
}

export function roleHomePath(role: string): string {
  return role === "ADMIN" ? "/admin" : "/me";
}

export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
