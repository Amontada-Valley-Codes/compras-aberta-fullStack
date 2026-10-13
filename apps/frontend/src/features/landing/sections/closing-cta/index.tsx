import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa6";

export function ClosingCtaSection() {
  return (
    <section className="closing-cta-section">
      <div className="public-container closing-cta-inner">
        <div className="closing-cta-copy">
          <h2>
            Pronto para <span className="closing-cta-highlight">impulsionar</span> a economia
            <br />
            do seu município?
          </h2>
          <p>
            Solicite seu acesso ao Compras Abertas e descubra como gestores
            públicos e microempresas podem agir com mais clareza, estratégia e
            confiança.
          </p>
          <div className="closing-cta-actions">
            <Link className="button closing-cta-primary" href="/analise">
              Conhecer a plataforma
            </Link>
            <Link className="button closing-cta-secondary" href="/me">
              Ver os planos
            </Link>
            <a
              className="closing-cta-whatsapp"
              href="#contato"
              aria-label="Falar pelo WhatsApp"
            >
              <FaWhatsapp />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
