import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.API_BASE_URL ?? process.env.BACKEND_URL ?? "http://localhost:3333";

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: "degraded", web: "ok", api: "error" },
        { status: 503 },
      );
    }

    return NextResponse.json({ status: "ok", web: "ok", api: "ok" });
  } catch {
    return NextResponse.json(
      { status: "degraded", web: "ok", api: "unreachable" },
      { status: 503 },
    );
  }
}
