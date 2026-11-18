import type { CSSProperties } from "react";

const questions = [
  [
    "O que é o Compras Abertas?",
    "O Compras Abertas é uma plataforma que organiza dados públicos municipais e facilita o acesso a informações sobre receitas, despesas, fornecedores, contratos e licitações.",
  ],
  [
    "Quem pode utilizar a plataforma?",
    "A plataforma atende gestores públicos, microempresas e cidadãos. Cada perfil possui recursos específicos, de acordo com suas necessidades.",
  ],
  [
    "Como funciona o acesso do Gestor Público?",
    "Basta preencher os dados solicitados no cadastro de Gestor Público. Após concluir o cadastro, o acesso à plataforma é liberado.",
  ],
  [
    "Como funciona o acesso da Microempresa?",
    "A empresa informa seus dados, realiza o pagamento da assinatura mensal e, após a confirmação do pagamento, recebe acesso automático à plataforma.",
  ],
  [
    "Quando meu acesso será liberado?",
    "Para Gestores Públicos, o acesso é liberado após a conclusão do cadastro. Para Microempresas, a liberação acontece automaticamente após a confirmação do pagamento.",
  ],
  [
    "Quais são os benefícios para microempresas?",
    "As empresas podem encontrar licitações compatíveis com seu segmento, receber alertas personalizados, consultar históricos de compras municipais, comparar municípios e acompanhar prazos de pagamento.",
  ],
  [
    "O acesso ao Portal Público é gratuito?",
    "Sim. O Portal Público é gratuito e permite consultar informações sobre receitas, despesas, licitações, contratos e fornecedores, sem necessidade de assinatura.",
  ],
  [
    "O cidadão precisa criar uma conta?",
    "Não. Os cidadãos podem consultar gratuitamente os dados públicos disponíveis e acompanhar como os recursos municipais estão sendo utilizados.",
  ],
];

export function FaqSection() {
  return (
    <section className="faq-section" id="faq">
      <div className="public-container faq-grid">
        <div className="faq-heading">
          <h2>Tire suas dúvidas.</h2>
          <p>
            Conheça os tipos de acesso, entenda como funciona o cadastro
            e descubra os recursos disponíveis em cada modalidade.
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
