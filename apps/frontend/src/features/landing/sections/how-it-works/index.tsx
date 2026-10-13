type ProcessStep = {
  title: string;
  description: string;
};

type ProcessBlock = {
  eyebrow: string;
  title: string;
  steps: ProcessStep[];
  variant: "manager" | "business";
};

const processBlocks: ProcessBlock[] = [
  {
    eyebrow: "Gestor público",
    title: "COMO FUNCIONA PARA O GESTOR PÚBLICO",
    variant: "manager",
    steps: [
      {
        title: "Solicite seu acesso",
        description: "Informe seus dados profissionais e os dados do órgão ou município que representa.",
      },
      {
        title: "Envie os documentos",
        description: "Anexe os documentos exigidos para confirmar sua identidade e seu vínculo com a gestão pública.",
      },
      {
        title: "Acompanhe a análise",
        description: "A equipe do Compras Abertas verificará as informações e os documentos enviados.",
      },
      {
        title: "Consulte o resultado",
        description: "A solicitação poderá aparecer como em análise, aprovada, recusada ou aguardando correção.",
      },
      {
        title: "Acesse a plataforma",
        description: "Após a aprovação, consulte os dados e recursos disponíveis para apoiar o planejamento e as decisões.",
      },
    ],
  },
  {
    eyebrow: "Microempresa",
    title: "COMO FUNCIONA PARA A MICROEMPRESA",
    variant: "business",
    steps: [
      {
        title: "Solicite seu cadastro",
        description: "Informe os dados da empresa e do responsável pelo acesso.",
      },
      {
        title: "Envie os documentos",
        description: "Anexe os documentos empresariais exigidos no processo de cadastro.",
      },
      {
        title: "Aguarde a verificação",
        description: "A equipe do Compras Abertas analisará os dados e confirmará se a empresa atende aos requisitos da plataforma.",
      },
      {
        title: "Acompanhe o resultado",
        description: "Consulte se a solicitação está em análise, aprovada, recusada ou aguardando correção.",
      },
      {
        title: "Encontre oportunidades",
        description: "Depois da aprovação, acesse licitações, históricos de compras, comparativos, prazos e alertas personalizados.",
      },
    ],
  },
];

function ProcessSteps({ steps }: { steps: ProcessStep[] }) {
  return (
    <ol className="how-it-works-steps">
      {steps.map((step, index) => {
        return (
          <li className="how-it-works-step" key={step.title}>
            <span className="how-it-works-step-marker" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ProcessBlockView({ block }: { block: ProcessBlock }) {
  const isManager = block.variant === "manager";

  return (
    <article className={`how-it-works-block how-it-works-block--${block.variant}`}>
      <div className="public-container how-it-works-grid">
        <div className="how-it-works-heading" data-aos="fade-up">
          <p className="how-it-works-eyebrow">{block.eyebrow}</p>
          <h2>{block.title}</h2>
        </div>
        <div className="how-it-works-content" data-aos="fade-up" data-aos-delay="120">
          <ProcessSteps steps={block.steps} />
        </div>
      </div>
    </article>
  );
}

export function HowItWorksSection() {
  return (
    <section className="how-it-works-section" id="como-funciona" aria-labelledby="how-it-works-title">
      <h2 className="sr-only" id="how-it-works-title">
        Como funciona o acesso ao Compras Abertas
      </h2>
      {processBlocks.map((block) => (
        <ProcessBlockView block={block} key={block.variant} />
      ))}
    </section>
  );
}
