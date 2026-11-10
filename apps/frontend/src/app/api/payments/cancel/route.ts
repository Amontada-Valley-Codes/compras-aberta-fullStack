import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/lib/auth/session";

const BACKEND_URL =
  process.env.API_BASE_URL ?? process.env.BACKEND_URL ?? "http://localhost:3333";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Não autenticado." },
        { status: 401 },
      );
    }

    const response = await fetch(`${BACKEND_URL}/payments/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || "Erro ao cancelar assinatura." },
        { status: response.status },
      );
    }

    // Encerra a sessão imediatamente após o cancelamento
    cookieStore.delete(SESSION_COOKIE);
    cookieStore.delete(REFRESH_COOKIE);

    const res = NextResponse.json(data);
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(REFRESH_COOKIE);

    return res;
  } catch {
    return NextResponse.json(
      { message: "Erro ao comunicar com o servidor de pagamentos." },
      { status: 500 },
    );
  }
}
