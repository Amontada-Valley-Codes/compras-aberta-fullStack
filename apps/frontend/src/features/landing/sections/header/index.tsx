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
          className={menuOpen ? "is-open" : ""}
          aria-label="Navegação principal"
        >
          <a href="#como-funciona" onClick={closeMenu}>
            Como funciona
          </a>
          <a href="#oportunidades" onClick={closeMenu}>
            Licitações
          </a>
          <Link href="/analise" onClick={closeMenu}>
            Transparência
          </Link>
          <Link href="/admin" onClick={closeMenu}>
            Para municípios
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
            aria-label="Buscar licitações"
          >
            <Search size={20} />
          </a>
          <Link className="header-login" href="/auth/login">
            LOGIN
          </Link>
        </div>
        <button
          className="mobile-nav-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Alternar menu"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
