"use client";

import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="public-header">
      <div className="public-container header-inner">
        <BrandLogo />
        <nav
          id="landing-navigation"
          className={menuOpen ? "is-open" : ""}
          aria-label="Navegação principal"
        >
          <Link href="#gestor-publico" onClick={closeMenu}>
            Gestor público
          </Link>
          <Link href="#microempresa" onClick={closeMenu}>
            Microempresa
          </Link>
          <Link href="/analise" onClick={closeMenu}>
            Portal público
          </Link>
          <Link href="#como-funciona" onClick={closeMenu}>
            Como funciona
          </Link>
          <a className="mobile-nav-action" href="#contato" onClick={closeMenu}>
            Contato
          </a>
          <Link
            className="mobile-nav-action mobile-nav-login"
            href="/auth/login"
            onClick={closeMenu}
          >
            Login
          </Link>
        </nav>
        <div className="header-actions">
          <a className="header-contact" href="#contato">
            Contato
          </a>
          <a
            className="header-search"
            href="#oportunidades"
            aria-label="Buscar dados públicos"
          >
            <Search size={20} />
          </a>
          <Link className="header-login" href="/auth/login">
            LOGIN
          </Link>
        </div>
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
