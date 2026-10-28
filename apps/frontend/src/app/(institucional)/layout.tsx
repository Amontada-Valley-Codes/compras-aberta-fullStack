import type { ReactNode } from "react";
import { LandingFooter } from "@/features/landing/sections/footer";
import { LandingHeader } from "@/features/landing/sections/header";
import "@/features/institutional/institutional.css";

// Páginas institucionais (contato, termos): mesmo cabeçalho e rodapé da
// landing, sem login.
export default function InstitutionalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-site">
      <LandingHeader />
      <main className="inst-main">{children}</main>
      <LandingFooter />
    </div>
  );
}
