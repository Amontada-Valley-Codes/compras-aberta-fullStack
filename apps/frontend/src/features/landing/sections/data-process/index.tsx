import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { RevealWords } from "../../RevealWords";

// Camada animada desenhada sobre fluxo-dados.png. O viewBox usa o mesmo
// tamanho do PNG (2001x786), então as coordenadas abaixo são pixels da
// imagem: anel com centro em (785, 415), selo "Dados conferidos" em
// (1074, 423), faixas de setas entre y 365 e 470 e o tubo ciano em y≈497.
// Ordem da animação: o dado entra pelas fontes públicas, percorre o anel,
// é conferido no selo dourado e segue para organização, cálculo e indicadores.
function DataFlowOverlay() {
  return (
    <svg
      className="data-flow-overlay"
      viewBox="0 0 2001 786"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="flow-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="flow-sheen" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="flow-sweep" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#bdf4ff" stopOpacity="0" />
          <stop offset="1" stopColor="#bdf4ff" stopOpacity="0.38" />
        </linearGradient>
        <clipPath id="flow-left-band">
          <polygon points="46,365 452,365 505,418 452,470 46,470 88,418" />
        </clipPath>
        <clipPath id="flow-right-band">
          <polygon points="1150,365 1935,365 1952,418 1935,470 1150,470" />
        </clipPath>
        <clipPath id="flow-ring">
          <circle cx="785" cy="415" r="300" />
        </clipPath>
      </defs>

      {/* 1. Luz atravessando a faixa "Fontes públicas" */}
      <g clipPath="url(#flow-left-band)">
        <rect className="flow-sheen flow-sheen-left" x="-260" y="340" width="260" height="160" fill="url(#flow-sheen)" />
      </g>

      {/* 2. Varredura girando pelas etapas do anel (coleta → validação → ...) */}
      <g clipPath="url(#flow-ring)">
        <path
          className="flow-ring-sweep"
          d="M785 415 L1085 415 A300 300 0 0 0 997 203 Z"
          fill="url(#flow-sweep)"
        />
      </g>

      {/* 3. Cometas de luz correndo pela borda ciano do anel */}
      <g className="flow-comet flow-comet-main" filter="url(#flow-glow)">
        <circle cx="785" cy="415" r="322" pathLength="100" />
      </g>
      <g className="flow-comet flow-comet-gold" filter="url(#flow-glow)">
        <circle cx="785" cy="415" r="322" pathLength="100" />
      </g>

      {/* 4. Ondas saindo do selo "Dados conferidos" */}
      <g className="flow-check">
        <circle cx="1074" cy="423" r="80" />
        <circle cx="1074" cy="423" r="80" />
      </g>

      {/* 5. Luz percorrendo organização → cálculo → indicadores */}
      <g clipPath="url(#flow-right-band)">
        <rect className="flow-sheen flow-sheen-right" x="900" y="340" width="300" height="160" fill="url(#flow-sheen)" />
      </g>

      {/* 6. Pacotes de dados correndo pelo tubo ciano */}
      <g className="flow-packets" filter="url(#flow-glow)">
        <rect x="1110" y="490" width="46" height="14" rx="7" />
        <rect x="1110" y="490" width="30" height="14" rx="7" />
        <rect x="1110" y="490" width="60" height="14" rx="7" />
      </g>

      {/* 7. Pulso nos ícones das notas de rodapé do diagrama */}
      <g className="flow-notes">
        <circle cx="1183" cy="630" r="44" />
        <circle cx="1562" cy="630" r="44" />
      </g>
    </svg>
  );
}

export function DataProcessSection() {
  return (
    <section className="data-process-section" id="processo-dados">
      <div className="data-process-aura" aria-hidden="true" />
      <div className="public-container data-process-inner">
        <div className="section-heading centered data-process-heading">
          <h2 data-reveal="words">
            <RevealWords text="Conheça o processo por trás dos dados." />
          </h2>
          <p data-reveal="blur" style={{ "--reveal-delay": "300ms" } as CSSProperties}>
            Reunimos, validamos e organizamos dados públicos para tornar a
            participação das microempresas mais fácil de entender.
          </p>
        </div>
        <div className="data-process-figure" data-reveal="flow">
          <picture className="data-process-picture">
            <source
              media="(max-width: 680px)"
              srcSet="/sections/fluxo-dados-mobile.png"
            />
            <Image
              src="/sections/fluxo-dados.png"
              alt="Fluxo de coleta, validação, cruzamento e organização dos dados de compras públicas"
              width={2001}
              height={786}
              sizes="(max-width: 680px) 94vw, 96vw"
            />
          </picture>
          <DataFlowOverlay />
        </div>
        <div data-reveal="up" style={{ "--reveal-delay": "200ms" } as CSSProperties}>
          <Link className="button data-process-action" href="/analise">
            Explorar os dados
          </Link>
        </div>
      </div>
    </section>
  );
}
