import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { ME_PLAN_MONTHLY_PRICE } from "@/lib/plans";
import { AudienceIcon, type AudienceIconName } from "../audiences";

type PlanPrice = {
  value: string;
  suffix?: string;
  note?: string;
};

type Plan = {
  id: "portal" | "me" | "gestor";
  title: string;
  icon: AudienceIconName;
  price: PlanPrice;
  description: string;
  benefits: string[];
  cta: string;
  href: string;
  featured?: boolean;
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Sem valor definido em ME_PLAN_MONTHLY_PRICE, o card mostra só "Assinatura mensal".
const mePlanPrice: PlanPrice =
  ME_PLAN_MONTHLY_PRICE == null
    ? { value: "Assinatura mensal" }
    : { value: brl.format(ME_PLAN_MONTHLY_PRICE), suffix: "/mês", note: "Assinatura mensal" };

const plans: Plan[] = [
  {
    id: "portal",
    title: "Portal Público",
    icon: "citizen",
    price: { value: "Gratuito" },
    description:
      "Para cidadãos que desejam acompanhar como os recursos públicos são utilizados.",
    benefits: [
      "Consulta de receitas e despesas",
      "Acesso às licitações e aos contratos",
      "Consulta de fornecedores",
      "Visualização dos gastos municipais",
      "Acesso sem assinatura",
    ],
    cta: "Acessar Portal Público",
    href: "/analise",
  },
  {
    id: "me",
    title: "Microempresa",
    icon: "business",
    price: mePlanPrice,
    description:
      "Para empresas que desejam encontrar oportunidades e se preparar para vender ao setor público.",
    benefits: [
      "Licitações compatíveis com o segmento",
      "Alertas personalizados",
      "Histórico de compras dos municípios",
      "Comparação entre municípios",
      "Consulta aos prazos de pagamento",
      "Análise de fornecedores e valores",
    ],
    cta: "Assinar plano ME",
    href: "/auth/cadastro?perfil=me",
    featured: true,
  },
  {
    id: "gestor",
    title: "Gestor Público",
    icon: "manager",
    price: { value: "Plano personalizado" },
    description:
      "Para municípios que precisam acompanhar recursos, compras, contratos e fornecedores.",
    benefits: [
      "Painel de receitas e despesas",
      "Acompanhamento de licitações e contratos",
      "Análise de fornecedores",
      "Indicadores municipais",
      "Comparações por período",
      "Relatórios",
      "Acesso para a equipe",
      "Suporte especializado",
    ],
    cta: "Solicitar proposta",
    // Ainda não há formulário de proposta: o pedido entra pelo cadastro do Gestor.
    href: "/auth/cadastro?perfil=gestor",
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
      <div className="plans-card-header">
        <span className="plans-card-icon">
          <AudienceIcon name={plan.icon} />
        </span>
        <h3 id={titleId}>{plan.title}</h3>
      </div>

      <p className="plans-card-price">
        <strong>{plan.price.value}</strong>
        {plan.price.suffix && <span className="plans-card-price-suffix">{plan.price.suffix}</span>}
        {plan.price.note && <span className="plans-card-price-note">{plan.price.note}</span>}
      </p>

      <p className="plans-card-description">{plan.description}</p>

      <ul className="plans-card-benefits">
        {plan.benefits.map((benefit) => (
          <li key={benefit}>
            <span className="plans-card-check" aria-hidden="true">
              <Check size={14} strokeWidth={3} />
            </span>
            {benefit}
          </li>
        ))}
      </ul>

      <Link
        className={`button plans-card-cta${plan.featured ? " plans-card-cta--featured" : " button-outline"}`}
        href={plan.href}
      >
        <span>{plan.cta}</span>
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </article>
  );
}

export function PlansSection() {
  return (
    <section className="plans-section" id="planos" aria-labelledby="plans-title">
      <div className="public-container">
        <div className="plans-heading" data-aos="fade-up">
          <h2 id="plans-title">Um acesso para cada necessidade</h2>
          <p>
            Consulte gratuitamente, encontre oportunidades ou leve mais
            inteligência para a gestão do seu município.
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
