"use client";

import { LogOut, ShieldAlert } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useLogout } from "./useGestorSession";

// Tela para quando o painel não pode abrir: gestor sem município vinculado ou
// falha ao consultar o perfil no backend. Sempre oferece "Sair".
export function GestorNotice({ title, message }: { title: string; message: string }) {
  const { logout, loggingOut } = useLogout();

  return (
    <div className="gs-page">
      <header className="gs-topbar">
        <div className="gs-container gs-topbar-inner">
          <BrandLogo />
          <div className="gs-topbar-actions gs-topbar-actions--end">
            <button type="button" className="gs-logout-button" onClick={() => void logout()} disabled={loggingOut}>
              <LogOut aria-hidden="true" /> <span>Sair</span>
            </button>
          </div>
        </div>
      </header>
      <main className="gs-container gs-main">
        <section className="ov-card gs-notice" role="alert">
          <ShieldAlert aria-hidden="true" />
          <h1>{title}</h1>
          <p>{message}</p>
        </section>
      </main>
    </div>
  );
}
