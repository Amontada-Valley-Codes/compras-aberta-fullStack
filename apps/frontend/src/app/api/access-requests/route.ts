import { NextResponse } from "next/server";
import { z } from "zod";
import { backendCreateAccessRequest } from "@/lib/auth/backend-access-requests";
import { backendErrorResponse } from "@/lib/auth/backend-error";

// Só confere o formato; as regras (CNPJ válido, e-mail único, município
// existente) ficam no backend, que devolve a mensagem certa para cada campo.
const bodySchema = z.object({
  name: z.string(),
  email: z.string(),
  password: z.string(),
  phone: z.string(),
  companyName: z.string(),
  cnpj: z.string(),
  municipioIbge: z.number(),
  message: z.string().optional(),
});

export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json({ message: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }

  try {
    const accessRequest = await backendCreateAccessRequest(request, parsed.data);
    return NextResponse.json(accessRequest, { status: 201 });
  } catch (error) {
    return backendErrorResponse(error);
  }
}
