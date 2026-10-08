import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import axios from "axios";
import { backendRefresh } from "@/lib/auth/backend-sessions";
import {
  authCookieOptions,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE_SECONDS,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  sessionHomePath,
  verifySessionToken,
} from "@/lib/auth/session";

// Chamado pelo cliente (features/dashboard/AppShell.tsx) enquanto a pessoa
// está com um painel aberto, para trocar o token de 15 min antes que ele
// expire, sem derrubar a sessão no meio do uso. O proxy.ts não faz esse
// refresh: ele só lê o cookie (checagem otimista), sem chamadas de rede.
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    cookieStore.delete(SESSION_COOKIE);
    cookieStore.delete(REFRESH_COOKIE);
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  try {
    const tokens = await backendRefresh(request, refreshToken);
    const session = verifySessionToken(tokens.token);

    if (!session) {
      cookieStore.delete(SESSION_COOKIE);
      cookieStore.delete(REFRESH_COOKIE);
      return NextResponse.json({ message: "Não foi possível renovar a sessão." }, { status: 502 });
    }

    cookieStore.set(SESSION_COOKIE, tokens.token, {
      ...authCookieOptions,
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    cookieStore.set(REFRESH_COOKIE, tokens.refreshToken, {
      ...authCookieOptions,
      maxAge: REFRESH_MAX_AGE_SECONDS,
    });

    return NextResponse.json({
      role: session.role,
      accessStatus: session.accessStatus,
      home: sessionHomePath(session),
    });
  } catch (error) {
    cookieStore.delete(SESSION_COOKIE);
    cookieStore.delete(REFRESH_COOKIE);

    if (axios.isAxiosError(error) && error.response) {
      return NextResponse.json(error.response.data, { status: error.response.status });
    }

    return NextResponse.json(
      { message: "Não foi possível conectar ao servidor de autenticação." },
      { status: 502 },
    );
  }
}
