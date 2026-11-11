import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.API_BASE_URL ?? process.env.BACKEND_URL ?? "http://localhost:3333";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("stripe-signature");
    const rawBody = await request.text();

    const response = await fetch(`${BACKEND_URL}/payments/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(signature ? { "stripe-signature": signature } : {}),
      },
      body: rawBody,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || "Erro ao processar webhook de pagamento." },
        { status: response.status },
      );
    }

    return NextResponse.json(data ?? { received: true });
  } catch {
    return NextResponse.json(
      { message: "Erro ao encaminhar webhook para o backend." },
      { status: 500 },
    );
  }
}
