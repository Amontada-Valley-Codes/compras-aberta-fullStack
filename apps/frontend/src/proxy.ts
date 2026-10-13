import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ACCESS_STATUS_PATH,
  SESSION_COOKIE,
  sessionHomePath,
  verifySessionToken,
} from "@/lib/auth/session";

const LOGIN_PATH = "/auth/login";
const ACCESS_REQUEST_PATH = "/auth/solicitar-acesso";

// Checagem otimista de rota (só lê e valida a assinatura do cookie, sem
// tocar no banco): decide quem pode ver /admin e /me e manda cada um para o
// lugar certo quando tenta abrir uma URL que não é a sua, ou o login quando
// não tem sessão. Empresa com solicitação de acesso pendente ou recusada só
// enxerga a página de status. A autorização "de verdade" (conta desativada,
// papel revogado, acesso não aprovado) continua sendo feita pelo backend em
// cada chamada autenticada.
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  const isAdminArea = pathname.startsWith("/admin");
  const isBusinessArea = pathname.startsWith("/me");
  const isAccessStatusPage = pathname === ACCESS_STATUS_PATH;
  const isPublicAuthPage = pathname === LOGIN_PATH || pathname === ACCESS_REQUEST_PATH;

  if ((isAdminArea || isBusinessArea || isAccessStatusPage) && !session) {
    const url = new URL(LOGIN_PATH, request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (!session) {
    return NextResponse.next();
  }

  const home = sessionHomePath(session);

  if (isAdminArea && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (isBusinessArea && (session.role !== "BUSINESS" || session.accessStatus !== "APPROVED")) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  // A página de status só faz sentido para quem ainda não foi liberado.
  if (isAccessStatusPage && home !== ACCESS_STATUS_PATH) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (isPublicAuthPage) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/me/:path*", "/acesso/status", "/auth/login", "/auth/solicitar-acesso"],
};
