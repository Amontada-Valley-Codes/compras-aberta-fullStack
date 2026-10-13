import { authApi } from "@/api/client";

export interface SessionTokens {
  token: string;
  refreshToken: string;
}

// O Next.js chama o Fastify de servidor para servidor (o navegador nunca
// fala direto com o backend), então o backend só enxergaria o IP do próprio
// servidor do Next.js — e o rate limit de login/refresh (por IP) puniria
// todo mundo junto. Repassamos o IP de quem realmente fez a requisição.
export function forwardClientIp(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip ? { headers: { "X-Forwarded-For": ip } } : undefined;
}

export async function backendLogin(request: Request, email: string, password: string) {
  const { data } = await authApi.post<SessionTokens>(
    "/sessions",
    { email, password },
    forwardClientIp(request),
  );
  return data;
}

export async function backendRefresh(request: Request, refreshToken: string) {
  const { data } = await authApi.post<SessionTokens>(
    "/sessions/refresh",
    { refreshToken },
    forwardClientIp(request),
  );
  return data;
}

export async function backendLogout(request: Request, refreshToken: string) {
  await authApi.post("/sessions/logout", { refreshToken }, forwardClientIp(request));
}
