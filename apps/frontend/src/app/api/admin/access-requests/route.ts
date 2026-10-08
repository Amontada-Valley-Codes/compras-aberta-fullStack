import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendListAccessRequests } from "@/lib/auth/backend-access-requests";
import { backendErrorResponse, sessionExpiredResponse } from "@/lib/auth/backend-error";
import { SESSION_COOKIE } from "@/lib/auth/session";

// O backend confere se o token é de um ADMIN; aqui só repassamos o cookie
// de sessão como Bearer.
export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return sessionExpiredResponse();

  try {
    return NextResponse.json(await backendListAccessRequests(token));
  } catch (error) {
    return backendErrorResponse(error);
  }
}
