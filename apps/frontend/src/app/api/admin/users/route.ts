import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

const BACKEND_URL =
  process.env.API_BASE_URL ?? process.env.BACKEND_URL ?? "http://localhost:3333";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const session = verifySessionToken(token);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ message: "Acesso não autorizado." }, { status: 403 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/admin/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message || "Não foi possível carregar os usuários." },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Erro ao listar admins:", error);
    return NextResponse.json(
      { message: "Erro ao conectar com o servidor." },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const session = verifySessionToken(token);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ message: "Acesso não autorizado." }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => null);
    const res = await fetch(`${BACKEND_URL}/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message || "Não foi possível criar o administrador.", issues: data?.issues },
        { status: res.status },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar admin:", error);
    return NextResponse.json(
      { message: "Erro ao conectar com o servidor." },
      { status: 502 },
    );
  }
}
