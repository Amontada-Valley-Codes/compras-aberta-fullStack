import { Check } from "lucide-react";
import Link from "next/link";
import { money } from "@/features/public-data/format";

type Plan = {
  id: "portal" | "me" | "gestor";
  title: string;
  price: number;
  benefits: string[];
  cta: string;
  href: string;
  featured?: boolean;
};

const plans: Plan[] = [
  {
    id: "portal",
    title: "Gratuito",
    price: 0,
    benefits: [
      "Veja os gastos por município, ano e tipo de despesa",
      "Veja a participação das microempresas locais nas compras",
      "Consulte quanto cada microempresa recebeu",
    ],
    cta: "Acessar painel",
    href: "/analise",
  },
  {
    id: "gestor",
    title: "Gestor Público",
    price: 59.99,
    benefits: [
      "Compare o plano anual de compras com o que já foi publicado",
      "Acompanhe licitações e vencimentos de contratos do PNCP",
      "Analise valores licitados por secretaria e modalidade",
      "Compare a evolução dos gastos municipais",
      "Detalhe pagamentos por fornecedor e tipo de despesa",
      "Veja no mapa os municípios dos fornecedores que receberam pagamentos",
      "Gere relatórios municipais em PDF ou PNG",
    ],
    cta: "Solicitar acesso",
    href: "/auth/cadastro?perfil=gestor",
    featured: true,
  },
  {
    id: "me",
    title: "Empresas",
    price: 39.99,
    benefits: [
      "Encontre editais abertos compatíveis com seu CNAE",
      "Filtre licitações por local, modalidade e faixa de valor",
      "Salve licitações e acompanhe cada etapa da participação",
      "Organize seus prazos com lembretes na agenda",
      "Controle certidões e exigências com um checklist de habilitação",
      "Calcule preços iniciais e lances mínimos com base nos seus custos e margens",
      "Gere propostas iniciais e ajustadas para salvar em PDF",
    ],
    cta: "Cadastrar empresa",
    href: "/auth/cadastro?perfil=me",
  },
];

function PlanCard({ plan, index }: { plan: Plan; index: number }) {
  const titleId = `plan-${plan.id}-title`;

  return (
    <article
      className={`plans-card${plan.featured ? " plans-card--featured" : ""}`}
      aria-labelledby={titleId}
      data-aos="fade-up"
      data-aos-delay={String(index * 100)}
    >
      <h3 className="plans-card-title" id={titleId}>{plan.title}</h3>
      <p className="plans-card-price">{money(plan.price)}</p>

      <Link
        className={`button plans-card-cta ${plan.featured ? "button-primary" : "button-outline"}`}
        href={plan.href}
      >
        {plan.cta}
      </Link>

      <h4 className="plans-card-benefits-title">Vantagens</h4>
      <ul className="plans-card-benefits" role="list">
        {plan.benefits.map((benefit) => (
          <li key={benefit}>
            <Check className="plans-card-check" size={16} strokeWidth={3} aria-hidden="true" />
            {benefit}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function PlansSection() {
  return (
    <section className="plans-section" id="planos" aria-labelledby="plans-title">
      <div className="public-container">
        <div className="plans-heading" data-aos="fade-up">
          <h2 id="plans-title">Escolha seu plano</h2>
          <p>
            Acompanhe os gastos do seu município, encontre editais para sua
            empresa ou analise contratações na gestão pública.
          </p>
        </div>

        <div className="plans-grid">
          {plans.map((plan, index) => (
            <PlanCard plan={plan} index={index} key={plan.id} />
          ))}
        </div>
      </div>
    </section>
  );
}
