import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.API_BASE_URL ?? process.env.BACKEND_URL ?? "http://localhost:3333";

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/plans`, {
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || "Erro ao buscar planos." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { message: "Erro ao comunicar com o servidor." },
      { status: 500 }
    );
  }
}
