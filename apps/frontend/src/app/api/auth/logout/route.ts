import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendLogout } from "@/lib/auth/backend-sessions";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  // Encerra a sessão nos cookies locais imediatamente
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);

  if (refreshToken) {
    try {
      // Best-effort com timeout de 1.2s para nunca travar a resposta do usuário
      await Promise.race([
        backendLogout(request, refreshToken),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1200)),
      ]);
    } catch {
      // Best-effort: se o backend falhar ou demorar, a sessão local já foi encerrada com sucesso.
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);

  return response;
}
