import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function LandingFooter() {
  return (
    <footer className="public-footer" id="contato">
      <div className="public-container footer-grid">
        <div className="footer-brand">
          <BrandLogo inverse />
          <p>
            Dados públicos mais claros para fortalecer microempresas e
            movimentar a economia local.
          </p>
        </div>
        <div>
          <b>Plataforma</b>
          <a href="#oportunidades">Licitações</a>
          <Link href="/analise">Transparência</Link>
          <Link href="/admin">Municípios</Link>
        </div>
        <div>
          <b>Acessos</b>
          <Link href="/me">Área da microempresa</Link>
          <Link href="/admin">Área administrativa</Link>
          <a href="#">Acessibilidade</a>
        </div>
        <div>
          <b>Dados públicos</b>
          <p>Consulte indicadores organizados a partir de fontes públicas.</p>
        </div>
      </div>
      <div className="public-container footer-bottom">
        <span>© 2026 Compras Abertas</span>
        <span>Feito para fortalecer a economia local.</span>
      </div>
    </footer>
  );
}
