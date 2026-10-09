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
    "Como vejo os tipos de compra de um município?",
    "Escolha o município para ver o panorama completo dos sete tipos de compra. A classificação segue a natureza oficial da despesa e aparece detalhada nos gráficos.",
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
          <h2>Tire suas dúvidas.</h2>
          <p>
            Entenda como consultar os dados e encontrar oportunidades para sua
            empresa.
          </p>
        </div>
        <div className="faq-list">
          {questions.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
