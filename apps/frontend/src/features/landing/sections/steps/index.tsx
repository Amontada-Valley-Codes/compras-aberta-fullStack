import Image from "next/image";
import {
  BellRing,
  ClipboardCheck,
  SlidersHorizontal,
  UserPlus,
} from "lucide-react";

const steps = [
  {
    icon: <UserPlus />,
    title: "Cadastre sua empresa",
    text: "e informe os dados do seu negócio.",
  },
  {
    icon: <SlidersHorizontal />,
    title: "Defina seus interesses",
    text: "por segmento, município e tipo de oportunidade.",
  },
  {
    icon: <BellRing />,
    title: "Receba oportunidades",
    text: "compatíveis pelo radar e pelas notificações.",
  },
  {
    icon: <ClipboardCheck />,
    title: "Acompanhe os prazos",
    text: "e prepare sua participação com mais organização.",
  },
];

export function StepsSection() {
  return (
    <section className="steps-section" id="como-funciona">
      <div className="public-container steps-grid">
        <div className="steps-content">
          <h2>Encontre oportunidades em poucos passos.</h2>
          <p className="steps-intro">
            Organize sua busca e acompanhe as licitações que combinam com a sua
            empresa em um só lugar.
          </p>
          <ol className="steps-list">
            {steps.map((step) => (
              <li key={step.title}>
                <span>{step.icon}</span>
                <p>
                  <b>{step.title}</b> {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
        <div className="steps-visual">
          <Image
            src="/sections/celular-oportunidades.png"
            alt="Celular exibindo o radar de oportunidades e uma lista de licitações"
            fill
            sizes="(max-width: 900px) 92vw, 48vw"
          />
        </div>
      </div>
    </section>
  );
}
