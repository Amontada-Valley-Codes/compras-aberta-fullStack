"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  SlidersHorizontal,
  UserPlus,
} from "lucide-react";
import { RevealWords } from "../../RevealWords";

const STEP_INTERVAL_MS = 3200;

const steps = [
  {
    icon: <UserPlus />,
    title: "Cadastre sua empresa",
    text: "e informe os dados do seu negócio.",
    toast: {
      icon: <CheckCircle2 />,
      title: "Empresa cadastrada",
      detail: "Dados conferidos na Receita",
    },
  },
  {
    icon: <SlidersHorizontal />,
    title: "Defina seus interesses",
    text: "por segmento, município e tipo de oportunidade.",
    toast: {
      icon: <SlidersHorizontal />,
      title: "Interesses salvos",
      detail: "Informática • Amontada • Pregão",
    },
  },
  {
    icon: <BellRing />,
    title: "Receba oportunidades",
    text: "compatíveis pelo radar e pelas notificações.",
    toast: {
      icon: <BellRing />,
      title: "Nova oportunidade compatível",
      detail: "Aquisição de equipamentos de informática",
    },
  },
  {
    icon: <ClipboardCheck />,
    title: "Acompanhe os prazos",
    text: "e prepare sua participação com mais organização.",
    toast: {
      icon: <CalendarClock />,
      title: "Prazo termina em 3 dias",
      detail: "Lembrete adicionado à sua agenda",
    },
  },
];

export function StepsSection() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [pinned, setPinned] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // A história só anda enquanto a seção está na tela e ninguém escolheu um
  // passo (hover ou clique fixa o passo escolhido).
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.35 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || pinned) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % steps.length),
      STEP_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [visible, pinned, active]);

  return (
    <section
      ref={sectionRef}
      className={`steps-section ${visible ? "is-in-view" : ""}`}
      id="como-funciona"
      style={{ "--step-duration": `${STEP_INTERVAL_MS}ms` } as CSSProperties}
    >
      <div className="public-container steps-grid">
        <div className="steps-content">
          <h2 data-reveal="words">
            <RevealWords text="Encontre oportunidades em poucos passos." />
          </h2>
          <p
            className="steps-intro"
            data-reveal="blur"
            style={{ "--reveal-delay": "250ms" } as CSSProperties}
          >
            Organize sua busca e acompanhe as licitações que combinam com a sua
            empresa em um só lugar.
          </p>
          <ol
            className={`steps-list ${pinned ? "is-pinned" : ""}`}
            onMouseLeave={() => setPinned(false)}
          >
            {steps.map((step, index) => (
              <li
                key={step.title}
                className={index === active ? "is-active" : ""}
                data-reveal="left"
                style={{ "--reveal-delay": `${350 + index * 120}ms` } as CSSProperties}
                onMouseEnter={() => {
                  setActive(index);
                  setPinned(true);
                }}
                onClick={() => {
                  setActive(index);
                  setPinned(true);
                }}
              >
                <span>
                  {step.icon}
                  <em>{index + 1}</em>
                </span>
                <p>
                  <b>{step.title}</b> {step.text}
                </p>
                {/* Barra que enche até o próximo passo; remonta a cada troca. */}
                {index === active && <i key={`${active}-${pinned}`} aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </div>
        <div className="steps-visual" data-reveal="up" style={{ "--reveal-delay": "200ms" } as CSSProperties}>
          <div className="steps-phone">
            <Image
              src="/sections/celular-oportunidades.png"
              alt="Celular exibindo o radar de oportunidades e uma lista de licitações"
              fill
              sizes="(max-width: 900px) 92vw, 48vw"
            />
            <span className="steps-screen-scan" aria-hidden="true" />
            <span className="steps-bell-ping" aria-hidden="true" />
            <span
              className={`steps-card-focus is-step-${active}`}
              aria-hidden="true"
            />
            <div className="steps-toasts" aria-live="polite">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  className={`steps-toast liquid-glass is-light toast-${index} ${index === active ? "is-active" : ""}`}
                  aria-hidden={index !== active}
                >
                  <span>{step.toast.icon}</span>
                  <div>
                    <b>{step.toast.title}</b>
                    <small>{step.toast.detail}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
