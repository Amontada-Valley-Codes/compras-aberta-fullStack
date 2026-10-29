import type { CSSProperties } from "react";
import { RevealWords } from "../../RevealWords";

const questions = [
  [
    "O que é o Compras Abertas?",
    "O Compras Abertas é uma plataforma que organiza dados públicos municipais e facilita o acesso a informações sobre receitas, despesas, fornecedores, contratos e licitações.",
  ],
  [
    "Quem pode utilizar a plataforma?",
    "A plataforma atende gestores públicos, microempresas e cidadãos. Alguns recursos são públicos, enquanto funcionalidades específicas para gestores e empresas exigem cadastro aprovado.",
  ],
  [
    "Como o Gestor público recebe acesso?",
    "O administrador da plataforma vincula o município e libera o acesso para a equipe responsável. A solicitação de cadastro é feita apenas quando o perfil exigir esse processo.",
  ],
  [
    "Quais documentos preciso enviar?",
    "Os documentos variam de acordo com o perfil escolhido. Durante o cadastro, a plataforma mostrará todos os documentos necessários para Gestor público ou ME.",
  ],
  [
    "Como acompanho minha solicitação?",
    "Você poderá consultar se sua solicitação está em análise, aprovada, recusada ou aguardando correção diretamente pela plataforma.",
  ],
  [
    "O que acontece depois da aprovação?",
    "Após a aprovação, seu acesso será liberado conforme o perfil cadastrado. Gestores públicos terão acesso aos recursos de gestão e análise, enquanto microempresas poderão acompanhar licitações, históricos de compras e alertas de oportunidades.",
  ],
  [
    "O que acontece se houver algum problema com meus documentos?",
    "A solicitação ficará aguardando correção. Você poderá consultar o motivo, substituir os documentos necessários e enviar novamente para análise.",
  ],
  [
    "O cidadão precisa solicitar acesso?",
    "Não. O cidadão poderá consultar gratuitamente os dados públicos disponíveis, acompanhar os gastos do município e verificar como o dinheiro público está sendo utilizado.",
  ],
];

export function FaqSection() {
  return (
    <section className="faq-section" id="faq">
      <div className="public-container faq-grid">
        <div className="faq-heading">
          <h2>Tire suas dúvidas.</h2>
          <p>
            Entenda como acessar os dados públicos, solicitar seu cadastro e
            acompanhar a análise da sua solicitação.
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
