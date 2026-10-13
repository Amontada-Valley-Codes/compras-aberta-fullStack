import { NextResponse } from "next/server";
import { backendFindCnpj } from "@/lib/auth/backend-access-requests";
import { backendErrorResponse } from "@/lib/auth/backend-error";

// Usada pelo formulário de solicitação de acesso para preencher os dados da
// empresa assim que o CNPJ é digitado. O backend valida o CNPJ e faz cache.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ cnpj: string }> },
) {
  const { cnpj } = await params;
  const digits = cnpj.replace(/\D/g, "");

  if (digits.length !== 14) {
    return NextResponse.json({ message: "CNPJ inválido" }, { status: 400 });
  }

  try {
    return NextResponse.json(await backendFindCnpj(request, digits));
  } catch (error) {
    return backendErrorResponse(error);
  }
}
