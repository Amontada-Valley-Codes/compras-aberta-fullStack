import { useEffect, useState } from "react";
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
const mePlanPrice: PlanPrice = {
  value: ME_PLAN_MONTHLY_PRICE == null ? "Assinatura mensal" : brl.format(ME_PLAN_MONTHLY_PRICE),
  suffix: "/mês",
  note: "7 dias grátis de teste",
};

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
    title: "Empresas em Geral",
    icon: "business",
    price: mePlanPrice,
    description:
      "Para empresas e fornecedores que desejam encontrar oportunidades de licitação e vender ao setor público.",
    benefits: [
      "Licitações compatíveis com o segmento",
      "Alertas personalizados",
      "Histórico de compras dos municípios",
      "Comparação entre municípios",
      "Consulta aos prazos de pagamento",
      "Análise de fornecedores e valores",
    ],
    cta: "Começar 7 dias grátis",
    href: "/auth/cadastro?perfil=me",
    featured: true,
  },
  {
    id: "gestor",
    title: "Gestor Público",
    icon: "manager",
    price: { value: "7 dias grátis", note: "Demonstração para o município" },
    description:
      "Para municípios e servidores públicos que precisam acompanhar recursos, compras, contratos e fornecedores.",
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
    cta: "Começar 7 dias grátis",
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
  const [dynamicPlans, setDynamicPlans] = useState<Plan[]>(plans);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/plans");
        if (res.ok) {
          const dbPlans = await res.json();
          if (Array.isArray(dbPlans) && dbPlans.length > 0) {
            const businessPlan = dbPlans.find(
              (p: any) => p.targetRole === "BUSINESS" && p.isActive
            );
            const managerPlan = dbPlans.find(
              (p: any) => p.targetRole === "MANAGER" && p.isActive
            );

            setDynamicPlans((prev) =>
              prev.map((item) => {
                if (item.id === "me" && businessPlan) {
                  return {
                    ...item,
                    title: businessPlan.name,
                    price: {
                      value: brl.format(businessPlan.priceCents / 100),
                      suffix: `/${businessPlan.interval === "year" ? "ano" : "mês"}`,
                      note: `${businessPlan.trialDays} dias grátis de teste`,
                    },
                    description: businessPlan.description || item.description,
                    benefits:
                      Array.isArray(businessPlan.features) &&
                      businessPlan.features.length > 0
                        ? businessPlan.features
                        : item.benefits,
                    featured: businessPlan.isFeatured,
                  };
                }
                if (item.id === "gestor" && managerPlan) {
                  return {
                    ...item,
                    title: managerPlan.name,
                    price: {
                      value: brl.format(managerPlan.priceCents / 100),
                      suffix: `/${managerPlan.interval === "year" ? "ano" : "mês"}`,
                      note: `${managerPlan.trialDays} dias grátis de teste`,
                    },
                    description: managerPlan.description || item.description,
                    benefits:
                      Array.isArray(managerPlan.features) &&
                      managerPlan.features.length > 0
                        ? managerPlan.features
                        : item.benefits,
                    featured: managerPlan.isFeatured,
                  };
                }
                return item;
              })
            );
          }
        }
      } catch {
        // Fallback silencioso para planos estáticos
      }
    }
    fetchPlans();
  }, []);

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
          {dynamicPlans.map((plan, index) => (
            <PlanCard plan={plan} index={index} key={plan.id} />
          ))}
        </div>
      </div>
    </section>
  );
}

