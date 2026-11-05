import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

const BACKEND_URL =
  process.env.API_BASE_URL ?? process.env.BACKEND_URL ?? "http://localhost:3333";

export async function proxyRadarRequest(
  backendPath: string,
  init?: { method?: string; body?: unknown },
): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Não autenticado." },
        { status: 401 },
      );
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    if (init?.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${BACKEND_URL}${backendPath}`, {
      method: init?.method ?? "GET",
      headers,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || "Erro na requisição do Radar." },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: "Serviço do Radar temporariamente indisponível." },
      { status: 502 },
    );
  }
}
