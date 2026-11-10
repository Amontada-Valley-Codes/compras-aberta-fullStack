"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Clock3, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface SubscriptionStatus {
  status: string;
  trialEndsAt: string | null;
  nextBillingAt?: string | null;
  cancelAtPeriodEnd?: boolean;
  isTrial: boolean;
  isActive: boolean;
  daysRemaining: number;
  canAccess: boolean;
  planName: string;
  hasCustomerPortal: boolean;
  plan?: {
    trialDays?: number;
  };
}

function formatDateBr(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function SubscriptionBanner({
  hideVisual = false,
}: {
  hideVisual?: boolean;
} = {}) {
  const [data, setData] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      toast.success("Assinatura confirmada com sucesso!", {
        description:
          "Seu plano foi ativado. Aproveite todos os recursos da plataforma!",
        duration: 8000,
      });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("checkout") === "cancelled") {
      toast.info("Processo de assinatura cancelado.", {
        description:
          "Você ainda pode continuar utilizando seus dias restantes de demonstração gratuita.",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }

    async function loadStatus() {
      try {
        const response = await fetch("/api/payments/status", {
          cache: "no-store",
        });
        if (response.ok) {
          const json = (await response.json()) as SubscriptionStatus;
          setData(json);

          // Bloqueio imediato somente quando o ciclo pago ou o teste gratuito realmente expira
          if (
            !json.canAccess &&
            (json.status === "canceled" ||
              json.status === "expired" ||
              json.status === "trial_expired")
          ) {
            await fetch("/api/auth/logout", { method: "POST" }).catch(
              () => undefined,
            );
            window.location.assign(
              `/auth/login?status=${json.status === "canceled" ? "canceled" : "expired"}`,
            );
          }
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
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
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

  if (loading || !data || hideVisual) return null;

  // Fora da aba "Assinatura", exibe o banner APENAS para contas em período de teste gratuito (acompanhamento diário)
  if (data.isTrial) {
    const totalTrialDays = data.plan?.trialDays || 7;
    const formattedEnd = formatDateBr(data.trialEndsAt);

    return (
      <div className="dashboard-page">
        <section className="attention-banner">
          <span>
            <Clock3 size={20} />
          </span>
          <div>
            <b>
              Avaliação gratuita: {data.daysRemaining} de {totalTrialDays}{" "}
              {data.daysRemaining === 1 ? "dia restante" : "dias restantes"}
              {formattedEnd ? ` (até ${formattedEnd})` : ""}
            </b>
            <p>
              Acompanhamento diário do seu período de teste. Para gerenciar ou
              ativar seu plano definitivo, acesse a aba &ldquo;Assinatura&rdquo;.
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

  // Caso o acesso tenha expirado e esteja redirecionando
  if (
    !data.canAccess &&
    (data.status === "trial_expired" ||
      data.status === "expired" ||
      data.status === "canceled")
  ) {
    return (
      <div className="dashboard-page">
        <section className="attention-banner">
          <span>
            <AlertTriangle size={20} />
          </span>
          <div>
            <b>
              {data.status === "canceled"
                ? "Seu ciclo de assinatura encerrou e o acesso está bloqueado"
                : "Seu período de demonstração gratuita de 7 dias encerrou"}
            </b>
            <p>
              Seus dados permanecem preservados. Redirecionando para a tela de
              acesso...
            </p>
          </div>
        </section>
      </div>
    );
  }

  // Quando a assinatura está ativa (ou com cancelamento agendado para o fim do ciclo),
  // NÃO exibe aviso nas demais telas — essas informações ficam exclusivamente na aba "Assinatura".
  return null;
}
