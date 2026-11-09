"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Clock3, CreditCard, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface SubscriptionStatus {
  status: string;
  trialEndsAt: string | null;
  isTrial: boolean;
  isActive: boolean;
  daysRemaining: number;
  canAccess: boolean;
  planName: string;
  hasCustomerPortal: boolean;
}

export function SubscriptionBanner() {
  const [data, setData] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      toast.success("Assinatura confirmada com sucesso!", {
        description: "Seu plano foi ativado. Aproveite todos os recursos da plataforma!",
        duration: 8000,
      });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("checkout") === "cancelled") {
      toast.info("Processo de assinatura cancelado.", {
        description: "Você ainda pode continuar utilizando seus dias restantes de demonstração gratuita.",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }

    async function loadStatus() {
      try {
        const response = await fetch("/api/payments/status");
        if (response.ok) {
          const json = await response.json();
          setData(json);
        }
      } catch (err) {
        console.error("Erro ao carregar status da assinatura", err);
      } finally {
        setLoading(false);
      }
    }

    void loadStatus();
  }, []);

  async function handleCheckout() {
    setCheckoutLoading(true);
    try {
      const response = await fetch("/api/payments/checkout", { method: "POST" });
      const body = await response.json();

      if (!response.ok) {
        toast.error("Erro ao iniciar pagamento", {
          description: body.message || "Tente novamente em instantes.",
        });
        setCheckoutLoading(false);
        return;
      }

      if (body.url) {
        window.location.href = body.url;
      }
    } catch {
      toast.error("Erro ao conectar com o serviço de pagamento.");
      setCheckoutLoading(false);
    }
  }

  async function handleOpenPortal() {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/payments/portal", { method: "POST" });
      const body = await response.json();

      if (!response.ok) {
        toast.error("Erro ao abrir portal da assinatura", {
          description: body.message || "Tente novamente em instantes.",
        });
        setPortalLoading(false);
        return;
      }

      if (body.url) {
        window.location.href = body.url;
      }
    } catch {
      toast.error("Erro ao conectar com o portal.");
      setPortalLoading(false);
    }
  }

  if (loading || !data) return null;

  // 1. Período de demonstração gratuita (7 dias) -> usa .attention-banner nativo do dashboard.css
  if (data.isTrial) {
    return (
      <div className="dashboard-page">
        <section className="attention-banner">
          <span>
            <Clock3 size={20} />
          </span>
          <div>
            <b>
              Período de demonstração gratuita — {data.daysRemaining}{" "}
              {data.daysRemaining === 1 ? "dia restante" : "dias restantes"}
            </b>
            <p>
              Você está com acesso liberado a todas as funcionalidades. Caso deseje, já pode ativar sua assinatura mensal definitiva.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleCheckout()}
            disabled={checkoutLoading}
          >
            {checkoutLoading ? (
              <>
                <RefreshCw size={16} className="spin" /> Redirecionando...
              </>
            ) : (
              <>
                Assinar agora <ArrowRight size={16} />
              </>
            )}
          </button>
        </section>
      </div>
    );
  }

  // 2. Período de teste expirado -> usa .attention-banner com destaque para ativação
  if (data.status === "trial_expired") {
    return (
      <div className="dashboard-page">
        <section className="attention-banner">
          <span>
            <AlertTriangle size={20} />
          </span>
          <div>
            <b>Seu período de demonstração gratuita de 7 dias encerrou</b>
            <p>
              Ative sua assinatura mensal para continuar monitorando licitações e utilizando o painel.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleCheckout()}
            disabled={checkoutLoading}
          >
            {checkoutLoading ? (
              <>
                <RefreshCw size={16} className="spin" /> Abrindo pagamento...
              </>
            ) : (
              <>
                <CreditCard size={16} /> Ativar assinatura
              </>
            )}
          </button>
        </section>
      </div>
    );
  }

  // 3. Assinatura ativa -> usa .company-status-banner nativo do dashboard.css
  if (data.isActive && data.hasCustomerPortal) {
    return (
      <div className="dashboard-page">
        <section className="company-status-banner">
          <span>
            <ShieldCheck size={20} />
          </span>
          <div>
            <small>ASSINATURA MENSAL ATIVA</small>
            <h2>{data.planName || "Plano Ativo"}</h2>
            <p>Seu acesso está regularizado e todas as ferramentas estão habilitadas.</p>
          </div>
          <button
            type="button"
            onClick={() => void handleOpenPortal()}
            disabled={portalLoading}
          >
            {portalLoading ? (
              <>
                <RefreshCw size={16} className="spin" /> Abrindo...
              </>
            ) : (
              <>
                Gerenciar assinatura <ExternalLink size={16} />
              </>
            )}
          </button>
        </section>
      </div>
    );
  }

  return null;
}
