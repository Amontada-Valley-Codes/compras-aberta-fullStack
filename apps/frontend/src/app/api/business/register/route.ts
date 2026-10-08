import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.API_BASE_URL ?? process.env.BACKEND_URL ?? "http://localhost:3333";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { message: "Formato de requisição inválido. É esperado multipart/form-data." },
        { status: 400 },
      );
    }

    const formData = await request.formData();

    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const headers: Record<string, string> = {};
    if (clientIp) {
      headers["X-Forwarded-For"] = clientIp;
    }

    // Usamos fetch nativo para enviar a FormData com multipart/form-data no Node.js
    const backendRes = await fetch(`${BACKEND_URL}/business/register`, {
      method: "POST",
      body: formData,
      headers,
    });

    const data = await backendRes.json().catch(() => null);

    if (!backendRes.ok) {
      const message =
        data?.message ||
        `Servidor respondeu com status ${backendRes.status}. Não foi possível concluir o cadastro.`;
      return NextResponse.json(
        { message, issues: data?.issues },
        { status: backendRes.status },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error("Erro no proxy de cadastro ME:", error);

    const errorMessage =
      error?.cause?.message || error?.message || "Não foi possível conectar ao servidor de cadastro.";

    return NextResponse.json(
      { message: `Falha ao conectar com o backend (${BACKEND_URL}): ${errorMessage}` },
      { status: 502 },
    );
  }
}
