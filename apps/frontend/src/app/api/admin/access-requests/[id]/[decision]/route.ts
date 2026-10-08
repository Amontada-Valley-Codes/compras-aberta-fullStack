import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendReviewAccessRequest } from "@/lib/auth/backend-access-requests";
import { backendErrorResponse, sessionExpiredResponse } from "@/lib/auth/backend-error";
import { SESSION_COOKIE } from "@/lib/auth/session";

const DECISIONS = ["approve", "reject"] as const;
type Decision = (typeof DECISIONS)[number];

function isDecision(value: string): value is Decision {
  return (DECISIONS as readonly string[]).includes(value);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; decision: string }> },
) {
  const { id, decision } = await params;
  if (!isDecision(decision)) {
    return NextResponse.json({ message: "Decisão inválida." }, { status: 404 });
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return sessionExpiredResponse();

  const body = await request.json().catch(() => null);
  const note = typeof body?.note === "string" ? body.note : undefined;

  try {
    return NextResponse.json(await backendReviewAccessRequest(token, id, decision, note));
  } catch (error) {
    return backendErrorResponse(error);
  }
}
