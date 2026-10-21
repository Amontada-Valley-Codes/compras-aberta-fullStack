import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendLogout } from "@/lib/auth/backend-sessions";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    try {
      await backendLogout(request, refreshToken);
    } catch {
      // Best-effort: mesmo se o backend não conseguir revogar (ex.: já
      // estava revogado, ou está fora do ar), a sessão local é encerrada.
    }
  }

  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);

  return NextResponse.json({ ok: true });
}
