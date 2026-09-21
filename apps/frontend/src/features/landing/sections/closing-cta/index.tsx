import Image from "next/image";
import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa6";

export function ClosingCtaSection() {
  return (
    <section className="closing-cta-section">
      <div className="closing-cta-visual" aria-hidden="true">
        <Image
          src="/sections/fechamento-oportunidades.png"
          alt=""
          fill
          sizes="(max-width: 900px) 100vw, 68vw"
        />
      </div>
      <div className="public-container closing-cta-inner">
        <div className="closing-cta-copy">
          <h2>Deixe a busca manual para trás.</h2>
          <p>
            Encontre licitações compatíveis com a sua empresa e acompanhe novas
            oportunidades em um só lugar.
          </p>
          <div className="closing-cta-actions">
            <Link className="button closing-cta-primary" href="/analise">
              Encontrar licitações
            </Link>
            <Link className="button closing-cta-secondary" href="/me">
              Conhecer os planos
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
