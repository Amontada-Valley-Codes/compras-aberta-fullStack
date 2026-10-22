"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import AOS from "aos";

export type AudienceIconName = "manager" | "business" | "citizen";

type AudienceCard = {
  audience: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: AudienceIconName;
  tone: "blue" | "gold" | "teal";
};

const audienceCards: AudienceCard[] = [
  {
    audience: "Gestor público",
    title: "Tenha o controle dos dados na palma da sua mão.",
    description:
      "Consulte receitas, despesas e fornecedores em uma visão organizada para acompanhar os recursos públicos e planejar com mais segurança.",
    cta: "Conhecer a solução",
    href: "/admin",
    icon: "manager",
    tone: "blue",
  },
  {
    audience: "Microempresa",
    title: "Encontre as oportunidades certas para sua empresa.",
    description:
      "Receba alertas de oportunidades personalizados para sua empresa e tenha acesso a todas as licitações disponíveis na plataforma. Conheça o histórico de compras dos municípios e os prazos de pagamento para planejar suas vendas com mais confiança.",
    cta: "Explorar oportunidades",
    href: "/me",
    icon: "business",
    tone: "gold",
  },
  {
    audience: "Cidadão",
    title: "Veja como o dinheiro público é usado.",
    description:
      "Acompanhe quanto seu município arrecada, onde gasta e quem recebe. Consulte informações claras para entender e fiscalizar a aplicação dos recursos públicos.",
    cta: "Consultar meu município",
    href: "/analise",
    icon: "citizen",
    tone: "teal",
  },
];

export function AudienceIcon({ name }: { name: AudienceIconName }) {
  const common = {
    width: 42,
    height: 42,
    viewBox: "0 0 42 42",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  } as const;

  if (name === "manager") {
    return (
      <svg {...common}>
        <rect x="7" y="8" width="28" height="27" rx="5" fill="#6ce3f8" fillOpacity=".28" />
        <path d="M12 34V12.5A2.5 2.5 0 0 1 14.5 10h13A2.5 2.5 0 0 1 30 12.5V34M9 34h24M17 34v-7h8v7M16 17h2M24 17h2M16 21h2M24 21h2" stroke="#11169b" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m16 26 3-3 3 2 5-6" stroke="#11169b" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "business") {
    return (
      <svg {...common}>
        <path d="M7 18.5 10.5 11h21l3.5 7.5" fill="#6ce3f8" fillOpacity=".28" />
        <path d="M7 18.5h28M9 18.5V33h24V18.5M14 33v-8h7v8M28 23h1M28 27h1M10.5 11h21l3.5 7.5H7L10.5 11Z" stroke="#11169b" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 18.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0" stroke="#11169b" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="21" cy="13.5" r="6" fill="#6ce3f8" fillOpacity=".35" />
      <circle cx="21" cy="13.5" r="5" stroke="#11169b" strokeWidth="1.9" />
      <path d="M10 34c.8-6.1 4.4-10 11-10s10.2 3.9 11 10" fill="#6ce3f8" fillOpacity=".28" />
      <path d="M10 34c.8-6.1 4.4-10 11-10s10.2 3.9 11 10M14 33h14" stroke="#11169b" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m29 9.5 4 1.5v3.2c0 2.6-1.6 4.8-4 5.8-2.4-1-4-3.2-4-5.8V11l4-1.5Z" fill="#6ce3f8" stroke="#11169b" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m27.5 14.2 1 1 2-2" stroke="#11169b" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AudiencesSection() {
  useEffect(() => {
    AOS.init({
      duration: 700,
      easing: "ease-out-cubic",
      once: true,
      offset: 80,
      disable: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });

    return () => AOS.refresh();
  }, []);

  return (
    <section className="audiences-section" aria-labelledby="audiences-title">
      <div className="public-container audiences-layout">
        <div className="audiences-cards">
          {audienceCards.map((card) => {
            return (
              <article
                className={`audience-card audience-card--${card.tone}`}
                id={card.icon === "manager" ? "gestor-publico" : card.icon === "business" ? "microempresa" : undefined}
                data-aos="fade-up"
                data-aos-delay={card.tone === "blue" ? "0" : card.tone === "gold" ? "100" : "200"}
                key={card.audience}
              >
                <div className="audience-card-icon">
                  <AudienceIcon name={card.icon} />
                </div>
                <p className="audience-card-label">{card.audience}</p>
                <h3>{card.title}</h3>
                <p className="audience-card-description">{card.description}</p>
                <Link className="audience-card-link" href={card.href}>
                  <span>{card.cta}</span>
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>

        <aside className="audiences-story" data-aos="fade-left">
          <h2 id="audiences-title">
            Menos trabalho manual. Mais clareza para decidir.
          </h2>
          <p className="audiences-story-highlight">
            Com o Compras Abertas, você transforma dados públicos em decisões
            certeiras.
          </p>
          <p>
            Receitas, despesas, fornecedores e licitações em um só lugar, para
            quem gere, empreende ou acompanha seu município.
          </p>
          <p>
            Compare municípios, filtre por ano e tipo de compra e encontre os
            dados que ajudam a entender o cenário das compras públicas.
          </p>
          <Link className="audiences-story-link" href="/auth/cadastro">
            Faça Seu Cadastro
          </Link>
        </aside>
      </div>
    </section>
  );
}
