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
        title: "Preencha seus dados",
        description:
          "Informe os dados solicitados no cadastro de Gestor Público e identifique seu município.",
      },
      {
        title: "Acesse a plataforma",
        description:
          "Após concluir o cadastro, seu acesso à plataforma é liberado.",
      },
      {
        title: "Explore os recursos disponíveis",
        description:
          "Consulte receitas, despesas, licitações, contratos, fornecedores e indicadores municipais.",
      },
    ],
  },
  {
    eyebrow: "Microempresa",
    title: "COMO FUNCIONA PARA A MICROEMPRESA",
    variant: "business",
    steps: [
      {
        title: "Preencha os dados da empresa",
        description:
          "Informe os dados da empresa e do responsável pelo acesso à plataforma.",
      },
      {
        title: "Realize o pagamento",
        description:
          "Escolha a assinatura mensal e conclua o pagamento para contratar o plano.",
      },
      {
        title: "Receba seu acesso automaticamente",
        description:
          "Após a confirmação do pagamento, seu acesso à plataforma é liberado automaticamente.",
      },
      {
        title: "Encontre oportunidades",
        description:
          "Consulte licitações, receba alertas personalizados e explore históricos de compras e informações dos municípios.",
      },
    ],
  },
];

function ProcessSteps({ steps }: { steps: ProcessStep[] }) {
  return (
    <ol className="how-it-works-steps">
      {steps.map((step, index) => (
        <li className="how-it-works-step" key={step.title}>
          <span className="how-it-works-step-marker" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ProcessBlockView({ block }: { block: ProcessBlock }) {
  return (
    <article
      className={`how-it-works-block how-it-works-block--${block.variant}`}
    >
      <div className="public-container how-it-works-grid">
        <div className="how-it-works-heading" data-aos="fade-up">
          <p className="how-it-works-eyebrow">{block.eyebrow}</p>
          <h2>{block.title}</h2>
        </div>

        <div
          className="how-it-works-content"
          data-aos="fade-up"
          data-aos-delay="120"
        >
          <ProcessSteps steps={block.steps} />
        </div>
      </div>
    </article>
  );
}

export function HowItWorksSection() {
  return (
    <section
      className="how-it-works-section"
      id="como-funciona"
      aria-labelledby="how-it-works-title"
    >
      <h2 className="sr-only" id="how-it-works-title">
        Como funciona o acesso ao Compras Abertas
      </h2>

      {processBlocks.map((block) => (
        <ProcessBlockView block={block} key={block.variant} />
      ))}
    </section>
  );
}
