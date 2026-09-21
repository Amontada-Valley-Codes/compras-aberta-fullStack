"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";

export function HeroSection() {
  const [activeSlide, setActiveSlide] = useState(1);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(
      () => setActiveSlide((current) => (current + 1) % 2),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [paused]);

  const move = (direction: -1 | 1) =>
    setActiveSlide((current) => (current + direction + 2) % 2);

  return (
    <section
      className="hero hero-carousel"
      aria-roledescription="carrossel"
      aria-label="Destaques da Compras Abertas"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="hero-slides" aria-live="polite">
        <article
          className={`hero-slide hero-slide-platform ${activeSlide === 0 ? "is-active" : ""}`}
          aria-hidden={activeSlide !== 0}
        >
          <div className="hero-platform-glow" />
          <div className="public-container hero-grid hero-grid-platform">
            <div className="hero-copy">
              <h1>
                Soluções inteligentes para <em>encontrar licitações.</em>
              </h1>
              <p>
                Tenha dashboard, radar de oportunidades e notificações em um só
                lugar para acompanhar prazos e encontrar licitações compatíveis
                com a sua empresa.
              </p>
              <div className="hero-actions">
                <a className="button hero-button-primary" href="#oportunidades">
                  Ver oportunidades
                </a>
                <Link className="button hero-button-secondary" href="/me">
                  Conhecer a plataforma
                </Link>
                <a
                  className="hero-whatsapp"
                  href="#contato"
                  aria-label="Falar pelo WhatsApp"
                >
                  <FaWhatsapp />
                </a>
              </div>
            </div>
            <div
              className="hero-platform-visual"
              aria-label="Dashboard com radar de oportunidades e notificações"
            >
              <Image
                src="/images/hero/dashboard-oportunidades.png"
                alt="Dashboard da plataforma com radar de oportunidades, notificações e licitações recomendadas"
                fill
                priority
                sizes="(max-width: 900px) 100vw, 62vw"
              />
            </div>
          </div>
        </article>
        <article
          className={`hero-slide hero-slide-business ${activeSlide === 1 ? "is-active" : ""}`}
          aria-hidden={activeSlide !== 1}
        >
          <div className="hero-business-halo" />
          <div className="public-container hero-grid hero-grid-business">
            <div className="hero-copy">
              <h1>
                Encontre licitações e transforme oportunidades em{" "}
                <em>novos negócios.</em>
              </h1>
              <p>
                Acompanhe compras públicas que combinam com a sua empresa e
                conheça os planos para participar com mais organização e
                agilidade.
              </p>
              <div className="hero-actions">
                <a className="button hero-button-primary" href="#oportunidades">
                  Encontrar licitações
                </a>
                <Link className="button hero-button-secondary" href="/me">
                  Conhecer os planos
                </Link>
              </div>
            </div>
            <div className="hero-people" aria-label="Jovens empreendedores">
              <Image
                src="/images/hero/foto-hero.png"
                alt="Dois jovens empreendedores"
                fill
                priority
                sizes="(max-width: 900px) 100vw, 58vw"
              />
            </div>
          </div>
        </article>
      </div>
      <button
        className="hero-arrow hero-arrow-prev"
        type="button"
        onClick={() => move(-1)}
        aria-label="Destaque anterior"
      >
        <ChevronLeft />
      </button>
      <button
        className="hero-arrow hero-arrow-next"
        type="button"
        onClick={() => move(1)}
        aria-label="Próximo destaque"
      >
        <ChevronRight />
      </button>
      <div
        className="hero-dots"
        role="tablist"
        aria-label="Selecionar destaque"
      >
        {[0, 1].map((slide) => (
          <button
            key={slide}
            type="button"
            className={activeSlide === slide ? "is-active" : ""}
            onClick={() => setActiveSlide(slide)}
            role="tab"
            aria-selected={activeSlide === slide}
            aria-label={`Mostrar destaque ${slide + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
