import { NextResponse } from "next/server";

const backendBaseUrl = () =>
  (process.env.API_BASE_URL ?? process.env.BACKEND_URL ?? "http://localhost:3333").replace(/\/+$/, "");

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const incomingUrl = new URL(request.url);
  const targetUrl = `${backendBaseUrl()}/analytics/${path.map(encodeURIComponent).join("/")}${incomingUrl.search}`;

  try {
    const response = await fetch(targetUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(25_000),
    });
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json; charset=utf-8",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Não foi possível consultar o serviço de analytics." },
      { status: 502 },
    );
  }
}
