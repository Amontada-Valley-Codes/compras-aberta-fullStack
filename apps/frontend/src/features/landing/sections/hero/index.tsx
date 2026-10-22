"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";

const SLIDE_INTERVAL_MS = 5000;

// Posições fixas (e não Math.random) para o HTML do servidor e do cliente
// serem iguais na hidratação.
const PARTICLES = [
  [8, 22, 3, 0],
  [17, 68, 2, 2.4],
  [26, 38, 4, 5.1],
  [34, 82, 2, 1.2],
  [43, 14, 3, 3.6],
  [52, 58, 2, 6.3],
  [61, 30, 3, 0.8],
  [69, 76, 4, 4.4],
  [77, 18, 2, 2.9],
  [85, 50, 3, 5.7],
  [92, 84, 2, 1.8],
  [97, 36, 3, 3.3],
] as const;

// Camadas decorativas do fundo: aurora, grade em perspectiva e partículas.
function HeroFx() {
  return (
    <div className="hero-fx" aria-hidden="true">
      <div className="hero-aurora">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="hero-gridlines" />
      <div className="hero-particles">
        {PARTICLES.map(([left, top, size, delay]) => (
          <span
            key={`${left}-${top}`}
            style={
              {
                left: `${left}%`,
                top: `${top}%`,
                "--size": `${size}px`,
                "--delay": `${delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

const reveal = (index: number) =>
  ({ "--i": index }) as CSSProperties;

export function HeroSection() {
  const [activeSlide, setActiveSlide] = useState(1);
  const [paused, setPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(
      () => setActiveSlide((current) => (current + 1) % 2),
      SLIDE_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [activeSlide, paused]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const move = (direction: -1 | 1) =>
    setActiveSlide((current) => (current + direction + 2) % 2);

  // Paralaxe: guarda a posição do ponteiro em --mx/--my (de -1 a 1) e o CSS
  // desloca aurora, dashboard e reflexos do vidro. Só com mouse e quando a
  // pessoa não pediu movimento reduzido.
  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const section = sectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;

    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      section.style.setProperty("--mx", x.toFixed(3));
      section.style.setProperty("--my", y.toFixed(3));
    });
  };

  const resetPointer = () => {
    sectionRef.current?.style.setProperty("--mx", "0");
    sectionRef.current?.style.setProperty("--my", "0");
  };

  return (
    <section
      ref={sectionRef}
      className="hero hero-carousel"
      aria-roledescription="carrossel"
      aria-label="Destaques da Compras Abertas"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        resetPointer();
      }}
      onPointerMove={handlePointerMove}
    >
      <div className="hero-slides" aria-live="polite">
        <article
          className={`hero-slide hero-slide-platform ${activeSlide === 0 ? "is-active" : ""}`}
          aria-hidden={activeSlide !== 0}
        >
          <HeroFx />
          <div className="hero-platform-glow" />
          <div className="public-container hero-grid hero-grid-platform">
            <div className="hero-copy">
              <span className="hero-chip liquid-glass hero-reveal" style={reveal(0)}>
                <i aria-hidden="true" />
                Radar de licitações em tempo real
              </span>
              <h1 className="hero-reveal" style={reveal(1)}>
                Soluções inteligentes para <em>encontrar licitações.</em>
              </h1>
              <p className="hero-reveal" style={reveal(2)}>
                Tenha dashboard, radar de oportunidades e notificações em um só
                lugar para acompanhar prazos e encontrar licitações compatíveis
                com a sua empresa.
              </p>
              <div className="hero-actions hero-reveal" style={reveal(3)}>
                <a className="button hero-button-primary" href="#oportunidades">
                  Ver oportunidades
                </a>
                <Link
                  className="button hero-button-secondary liquid-glass"
                  href="/auth/login?perfil=me"
                >
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
              <div className="hero-visual-float">
                <Image
                  src="/images/hero/dashboard-oportunidades.png?v=2"
                  alt="Dashboard da plataforma com radar de oportunidades, notificações e licitações recomendadas"
                  fill
                  priority
                  sizes="(max-width: 900px) 100vw, 62vw"
                />
              </div>
              <span className="hero-badge liquid-glass" aria-hidden="true">
                <i />
                <span>
                  <b>Dados públicos conectados</b>
                  <small>PNCP • TCE-CE • IBGE</small>
                </span>
              </span>
            </div>
          </div>
        </article>
        <article
          className={`hero-slide hero-slide-business ${activeSlide === 1 ? "is-active" : ""}`}
          aria-hidden={activeSlide !== 1}
        >
          <HeroFx />
          <div className="hero-business-halo" />
          <div className="public-container hero-grid hero-grid-business">
            <div className="hero-copy">
              <span className="hero-chip liquid-glass hero-reveal" style={reveal(0)}>
                <i aria-hidden="true" />
                Feito para microempresas do Ceará
              </span>
              <h1 className="hero-reveal" style={reveal(1)}>
                Encontre licitações e transforme oportunidades em{" "}
                <em>novos negócios.</em>
              </h1>
              <p className="hero-reveal" style={reveal(2)}>
                Acompanhe compras públicas que combinam com a sua empresa e
                conheça os planos para participar com mais organização e
                agilidade.
              </p>
              <div className="hero-actions hero-reveal" style={reveal(3)}>
                <a className="button hero-button-primary" href="#oportunidades">
                  Encontrar licitações
                </a>
                <Link className="button hero-button-secondary" href="/auth/login?perfil=me">
                  Conhecer os planos
                </Link>
              </div>
            </div>
            <div className="hero-people" aria-label="Profissionais empreendedores">
              <Image
                src="/images/hero/foto-hero.png"
                alt="Três profissionais empreendedores de diferentes perfis"
                fill
                priority
                sizes="(max-width: 900px) 100vw, 58vw"
              />
            </div>
          </div>
        </article>
      </div>
      <button
        className="hero-arrow hero-arrow-prev liquid-glass"
        type="button"
        onClick={() => move(-1)}
        aria-label="Destaque anterior"
      >
        <ChevronLeft />
      </button>
      <button
        className="hero-arrow hero-arrow-next liquid-glass"
        type="button"
        onClick={() => move(1)}
        aria-label="Próximo destaque"
      >
        <ChevronRight />
      </button>
      <div
        className={`hero-dots liquid-glass ${paused ? "is-paused" : ""}`}
        role="tablist"
        aria-label="Selecionar destaque"
        style={{ "--slide-duration": `${SLIDE_INTERVAL_MS}ms` } as CSSProperties}
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
          >
            {/* Barra de progresso até a troca automática; remonta (e
                recomeça do zero) junto com o timer ao trocar ou retomar. */}
            {activeSlide === slide && <span key={`${activeSlide}-${paused}`} />}
          </button>
        ))}
      </div>
    </section>
  );
}
