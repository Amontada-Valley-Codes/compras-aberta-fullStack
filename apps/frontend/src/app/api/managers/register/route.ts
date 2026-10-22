import { NextResponse } from "next/server";
import { z } from "zod";
import { authApi } from "@/api/client";
import { backendErrorResponse } from "@/lib/auth/backend-error";
import { forwardClientIp } from "@/lib/auth/backend-sessions";

// Cadastro do Gestor Público. Só confere o formato; as regras (e-mail único)
// ficam no backend, que devolve a mensagem de cada campo.
const bodySchema = z.object({
  name: z.string(),
  email: z.string(),
  password: z.string(),
});

export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json({ message: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }

  try {
    const { data } = await authApi.post("/managers/register", parsed.data, forwardClientIp(request));
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return backendErrorResponse(error);
  }
}
