"use client";

import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  // Ao rolar, o vidro do header fica mais denso e ganha sombra.
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header className={`public-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="public-container header-inner">
        <BrandLogo />
        <nav
          id="landing-navigation"
          className={menuOpen ? "is-open" : ""}
          aria-label="Navegação principal"
        >
          <Link href="/#gestor-publico" onClick={closeMenu}>
            Gestor público
          </Link>
          <Link href="/#microempresa" onClick={closeMenu}>
            Empresas
          </Link>
          <Link href="/analise" onClick={closeMenu}>
            Portal público
          </Link>
          <Link href="/#como-funciona" onClick={closeMenu}>
            Como funciona
          </Link>
          <Link className="mobile-nav-action" href="/contato" onClick={closeMenu}>
            Contato
          </Link>
          <Link
            className="mobile-nav-action mobile-nav-login"
            href="/auth/login"
            onClick={closeMenu}
          >
            Login
          </Link>
        </nav>
        <div className="header-actions">
          <Link className="header-contact" href="/contato">
            Contato
          </Link>
          <Link
            className="header-search"
            href="/#oportunidades"
            aria-label="Buscar dados públicos"
          >
            <Search size={20} />
          </Link>
          <Link className="header-login liquid-glass is-light" href="/auth/login">
            LOGIN
          </Link>
        </div>
        <span className="scroll-progress" aria-hidden="true" />
        <button
          type="button"
          className="mobile-nav-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Alternar menu"
          aria-controls="landing-navigation"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
