import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function LandingFooter() {
  return (
    <footer className="public-footer" id="contato">
      <div className="public-container footer-grid" data-reveal="up">
        <div className="footer-brand">
          <BrandLogo inverse />
          <p>
            Dados públicos mais claros para fortalecer microempresas e
            movimentar a economia local.
          </p>
        </div>
        <div>
          <b>Plataforma</b>
          <Link href="/#oportunidades">Licitações</Link>
          <Link href="/analise">Transparência</Link>
          <Link href="/analise">Municípios</Link>
        </div>
        <div>
          <b>Acessos</b>
          <Link href="/me">Área da microempresa</Link>
          <Link href="/gestor">Área do gestor público</Link>
          <Link href="/contato">Contato</Link>
        </div>
        <div>
          <b>Dados públicos</b>
          <p>Consulte indicadores organizados a partir de fontes públicas.</p>
        </div>
        <div>
          <b>Institucional</b>
          <Link href="/termos">Termos e compromissos</Link>
          <Link href="/termos#privacidade">Privacidade e dados</Link>
          <Link href="/termos#acessibilidade">Acessibilidade</Link>
        </div>
      </div>
      <div className="public-container footer-bottom">
        <span>© 2026 Compras Abertas</span>
        <span>Feito para fortalecer a economia local.</span>
      </div>
    </footer>
  );
}
