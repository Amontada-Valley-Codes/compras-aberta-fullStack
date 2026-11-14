import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import axios from "axios";
import { z } from "zod";
import { backendLogin } from "@/lib/auth/backend-sessions";
import { setAuthCookies } from "@/lib/auth/auth-cookies";
import { sessionHomePath, verifySessionToken } from "@/lib/auth/session";

const bodySchema = z.object({
  email: z.email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
  remember: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json({ message: "Informe e-mail e senha." }, { status: 400 });
  }

  try {
    const tokens = await backendLogin(request, parsed.data.email, parsed.data.password);
    const session = verifySessionToken(tokens.token);

    if (!session) {
      return NextResponse.json(
        { message: "Não foi possível iniciar a sessão." },
        { status: 502 },
      );
    }

    setAuthCookies(await cookies(), tokens, parsed.data.remember);

    return NextResponse.json({
      role: session.role,
      accessStatus: session.accessStatus,
      home: sessionHomePath(session),
    });
  } catch (error) {
    // O backend já devolve mensagens prontas em pt-BR (401/403/429/400);
    // repassamos exatamente o que ele respondeu.
    if (axios.isAxiosError(error) && error.response) {
      return NextResponse.json(error.response.data, { status: error.response.status });
    }

    return NextResponse.json(
      { message: "Não foi possível conectar ao servidor de autenticação." },
      { status: 502 },
    );
  }
}
