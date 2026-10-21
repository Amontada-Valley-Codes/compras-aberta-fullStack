import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

const BACKEND_URL =
  process.env.API_BASE_URL ?? process.env.BACKEND_URL ?? "http://localhost:3333";

export async function GET(
  _request: Request,
  context: { params: Promise<{ cnpj: string; docType: string }> },
) {
  const { cnpj, docType } = await context.params;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return new NextResponse("Não autenticado", { status: 401 });
  }

  const session = verifySessionToken(token);
  if (!session || (session.role !== "ADMIN" && session.role !== "BUSINESS")) {
    return new NextResponse("Acesso não autorizado", { status: 403 });
  }

  try {
    const backendRes = await fetch(
      `${BACKEND_URL}/admin/business-requests/${encodeURIComponent(cnpj)}/document/${encodeURIComponent(docType)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!backendRes.ok) {
      return new NextResponse("Documento não encontrado ou indisponível", {
        status: backendRes.status,
      });
    }

    const contentType = backendRes.headers.get("content-type") || "application/pdf";
    const buffer = await backendRes.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${docType}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Erro ao buscar documento do backend:", error);
    return new NextResponse("Erro ao carregar documento", { status: 500 });
  }
}
