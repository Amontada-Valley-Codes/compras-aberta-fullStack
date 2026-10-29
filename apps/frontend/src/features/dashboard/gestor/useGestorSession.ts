"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/sonner";

// Mesmo comportamento do AppShell (que não é usado no painel do gestor):
// renova o token de acesso (15 min) um pouco antes de expirar enquanto o
// painel estiver aberto, e encerra a sessão pelo /api/auth/logout.
const SESSION_REFRESH_INTERVAL_MS = 12 * 60 * 1000;

export function useSessionKeepAlive() {
  useEffect(() => {
    const id = window.setInterval(() => {
      fetch("/api/auth/refresh", { method: "POST" }).catch(() => undefined);
    }, SESSION_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);
}

export function useLogout() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    setLoggingOut(true);
    const toastId = toast.loading("Encerrando sua sessão…");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error(`Logout falhou (${response.status})`);
    } catch {
      // Sem resposta do servidor os cookies continuam lá; ir para o login
      // faria o proxy.ts devolver a pessoa ao painel.
      toast.error("Não foi possível sair", { id: toastId, description: "Verifique sua conexão e tente novamente." });
      setLoggingOut(false);
      return;
    }
    toast.info("Você saiu da sua conta", { id: toastId, description: "Até logo! Sua sessão foi encerrada com segurança." });
    router.push("/auth/login");
  };

  return { logout, loggingOut };
}
