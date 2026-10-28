import { cookies } from "next/headers";
import { authApi } from "@/api/client";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

// Sem "use client": roda no servidor, na página /gestor. O proxy.ts já barrou
// quem não é MANAGER nem ADMIN; aqui o perfil vem do backend (fonte de
// verdade), que diz a qual município o gestor está vinculado.

interface MeResponse {
  name: string;
  role: string;
  municipioIbge: number | null;
}

export type GestorAccess =
  // Gestor: o painel abre na prefeitura da conta (null = conta sem vínculo).
  | { kind: "manager"; userName: string; municipalityIbge: string | null }
  // Administrador: entra para dar suporte. Os dois escolhem qualquer município.
  | { kind: "admin"; userName: string }
  | { kind: "error" };

export async function loadGestorAccess(): Promise<GestorAccess | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !verifySessionToken(token)) return null;

  try {
    const { data } = await authApi.get<MeResponse>("/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (data.role === "MANAGER") {
      return {
        kind: "manager",
        userName: data.name,
        municipalityIbge: data.municipioIbge == null ? null : String(data.municipioIbge),
      };
    }
    if (data.role === "ADMIN") return { kind: "admin", userName: data.name };
    return null;
  } catch {
    return { kind: "error" };
  }
}
