import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { roleHomePath, SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

const LOGIN_PATH = "/auth/login";

// Checagem otimista de rota (só lê e valida a assinatura do cookie, sem
// tocar no banco): decide quem pode ver /admin e /me e manda cada um para o
// lugar certo quando tenta abrir uma URL que não é a sua, ou o login quando
// não tem sessão. A autorização "de verdade" (conta desativada, papel
// revogado) continua sendo feita pelo backend em cada chamada autenticada.
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  const isAdminArea = pathname.startsWith("/admin");
  const isBusinessArea = pathname.startsWith("/me");
  const isLoginPage = pathname === LOGIN_PATH;

  if ((isAdminArea || isBusinessArea) && !session) {
    const url = new URL(LOGIN_PATH, request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (session && isAdminArea && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL(roleHomePath(session.role), request.url));
  }

  if (session && isBusinessArea && session.role !== "BUSINESS") {
    return NextResponse.redirect(new URL(roleHomePath(session.role), request.url));
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL(roleHomePath(session.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/me/:path*", "/auth/login"],
};
