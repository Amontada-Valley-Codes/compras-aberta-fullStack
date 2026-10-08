import type { CSSProperties } from "react";
import { RevealWords } from "../../RevealWords";

const questions = [
  [
    "O que é a Compras Abertas?",
    "É uma plataforma que organiza dados de compras públicas e facilita a consulta da participação de microempresas por município.",
  ],
  [
    "De onde vêm os dados apresentados?",
    "Os registros são reunidos a partir de fontes públicas como PNCP, TCE-CE e IBGE. O OpenCNPJ ajuda a confirmar a classificação das empresas.",
  ],
  [
    "Como a participação das microempresas é calculada?",
    "A plataforma cruza empresas e licitações, remove duplicidades e organiza os registros para apresentar os indicadores conforme os filtros escolhidos.",
  ],
  [
    "Posso filtrar os dados por município e tipo de compra?",
    "Sim. Escolha o município e o tipo de compra (como materiais, obras ou serviços) na busca da página inicial ou na página de análise. O tipo de compra segue a classificação oficial do orçamento público, chamada de “natureza da despesa”.",
  ],
  [
    "A consulta dos dados públicos é gratuita?",
    "Sim. A consulta dos indicadores públicos pode ser feita diretamente pela landing page e pela página de análise.",
  ],
  [
    "Como encontro licitações para minha empresa?",
    "A área da microempresa oferece radar de oportunidades, filtros e notificações para ajudar a acompanhar licitações compatíveis com o seu perfil.",
  ],
];

export function FaqSection() {
  return (
    <section className="faq-section" id="faq">
      <div className="public-container faq-grid">
        <div className="faq-heading">
          <h2 data-reveal="words">
            <RevealWords text="Tire suas dúvidas." />
          </h2>
          <p data-reveal="blur" style={{ "--reveal-delay": "200ms" } as CSSProperties}>
            Entenda como consultar os dados e encontrar oportunidades para sua
            empresa.
          </p>
        </div>
        <div className="faq-list">
          {questions.map(([question, answer], index) => (
            <details
              key={question}
              data-reveal="up"
              style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties}
            >
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
