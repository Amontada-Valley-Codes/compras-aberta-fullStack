import { NextResponse } from "next/server";

// As telas de demonstração ficam acessíveis sem login. As APIs continuam
// responsáveis por validar permissões quando uma ação exige uma sessão.
export default function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/me/:path*", "/auth/login"],
};
