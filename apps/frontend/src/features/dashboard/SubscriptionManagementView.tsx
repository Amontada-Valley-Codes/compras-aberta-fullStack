"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  ExternalLink,
  Landmark,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface PlanDetails {
  id: string | null;
  name: string;
  description: string;
  priceCents: number;
  formattedPrice: string;
  interval: string;
  trialDays: number;
  features: string[];
}

interface SubscriptionStatusResponse {
  status: string;
  trialEndsAt: string | null;
  nextBillingAt: string | null;
  cancelAtPeriodEnd: boolean;
  isTrial: boolean;
  isActive: boolean;
  daysRemaining: number;
  canAccess: boolean;
  planName: string;
  plan: PlanDetails;
  hasCustomerPortal: boolean;
}

function formatDateBrLong(iso: string | null): string {
  if (!iso) return "Não programada";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Não programada";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateBrShort(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function SubscriptionManagementView({
  role = "BUSINESS",
}: {
  role?: "BUSINESS" | "MANAGER";
}) {
  const [data, setData] = useState<SubscriptionStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const loadSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/payments/status", {
        cache: "no-store",
      });
      if (response.ok) {
        const json = (await response.json()) as SubscriptionStatusResponse;
        setData(json);

        // Quando o ciclo pago ou o período de teste chega ao fim, bloqueia o acesso imediatamente
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
    } catch {
      toast.error("Não foi possível carregar os dados da sua assinatura.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  // Abre o portal de gerenciamento (faturas, cartão, cancelamento/reativação)
  async function handleOpenPortal() {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/payments/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error("Não foi possível abrir o gerenciamento da assinatura", {
          description: body.message || "Tente novamente em instantes.",
        });
        setPortalLoading(false);
        return;
      }

      if (body.url) {
        window.location.href = body.url;
      }
    } catch {
      toast.error("Erro ao conectar com o ambiente de gerenciamento.");
      setPortalLoading(false);
    }
  }

  // Abre diretamente o checkout de pagamento (para assinar no trial ou para pagar/assinar novamente caso tenha cancelado)
  async function handleCheckout() {
    setCheckoutLoading(true);
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: data?.plan?.id ?? undefined }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error("Não foi possível iniciar o pagamento", {
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

  const profileLabel =
    role === "MANAGER" ? "Gestor Público" : "Empresas em Geral";
  const totalTrialDays = data?.plan?.trialDays || 7;

  return (
    <div className="dashboard-page">
      {/* Cabeçalho padrão do projeto (.dashboard-heading) */}
      <header className="dashboard-heading">
        <div>
          <span>{`FATURAMENTO & ASSINATURA · ${profileLabel.toUpperCase()}`}</span>
          <h1>Minha assinatura</h1>
          <p>
            Visualize os detalhes do seu plano atual, acompanhe a data da
            próxima cobrança e gerencie seus pagamentos.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {data?.isActive && data?.cancelAtPeriodEnd && (
            <button
              type="button"
              className="ds-button primary"
              onClick={() => void handleCheckout()}
              disabled={checkoutLoading || portalLoading || loading}
            >
              {checkoutLoading ? (
                <>
                  <RefreshCw size={17} className="spin" /> Abrindo pagamento...
                </>
              ) : (
                <>
                  <CreditCard size={17} /> Assinar / Pagar novamente
                </>
              )}
            </button>
          )}
          <button
            type="button"
            className={
              data?.isActive && data?.cancelAtPeriodEnd
                ? "ds-button secondary"
                : "ds-button primary"
            }
            onClick={() =>
              void (data?.isActive ? handleOpenPortal() : handleCheckout())
            }
            disabled={portalLoading || checkoutLoading || loading}
          >
            {portalLoading || (!data?.isActive && checkoutLoading) ? (
              <>
                <RefreshCw size={17} className="spin" /> Redirecionando...
              </>
            ) : (
              <>
                <ExternalLink size={17} />{" "}
                {data?.isActive ? "Gerenciar assinatura" : "Ativar assinatura"}
              </>
            )}
          </button>
        </div>
      </header>

      {loading && !data ? (
        <section className="dashboard-card admin-table-card">
          <p style={{ margin: 0, color: "#64748b" }}>
            Carregando informações da assinatura...
          </p>
        </section>
      ) : data ? (
        <>
          {/* Banner exclusivo da aba Assinatura (.company-status-banner / .attention-banner) */}
          {data.isActive && data.cancelAtPeriodEnd ? (
            <section className="attention-banner">
              <span>
                <Clock3 size={20} />
              </span>
              <div>
                <b>
                  CANCELAMENTO AGENDADO PARA O FIM DO CICLO —{" "}
                  {data.plan.name} (Acesso garantido até{" "}
                  {formatDateBrShort(data.nextBillingAt)})
                </b>
                <p>
                  Sua renovação foi cancelada, mas você continua com acesso
                  total até {formatDateBrLong(data.nextBillingAt)} (fim do
                  período já pago). Caso deseje continuar após essa data, você
                  pode pagar/reativar sua assinatura abaixo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleCheckout()}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? (
                  <>
                    <RefreshCw size={16} className="spin" /> Abrindo...
                  </>
                ) : (
                  <>
                    Pagar novamente <ArrowRight size={16} />
                  </>
                )}
              </button>
            </section>
          ) : data.isActive ? (
            <section className="company-status-banner">
              <span>
                <ShieldCheck size={20} />
              </span>
              <div>
                <small>ASSINATURA MENSAL ATIVA</small>
                <h2>
                  {data.plan.name} — Próxima cobrança em{" "}
                  {formatDateBrShort(data.nextBillingAt)}
                </h2>
                <p>
                  Seu acesso está liberado para todas as funcionalidades. Próximo
                  faturamento programado para{" "}
                  {formatDateBrLong(data.nextBillingAt)}.
                </p>
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
          ) : data.isTrial ? (
            <section className="attention-banner">
              <span>
                <Clock3 size={20} />
              </span>
              <div>
                <b>
                  Período de demonstração gratuita — {data.daysRemaining} de{" "}
                  {totalTrialDays}{" "}
                  {data.daysRemaining === 1 ? "dia restante" : "dias restantes"}{" "}
                  · Fim do teste: {formatDateBrShort(data.trialEndsAt)}
                </b>
                <p>
                  Acompanhamento diário da sua avaliação gratuita (encerra em{" "}
                  {formatDateBrLong(data.trialEndsAt)}). Ative sua assinatura
                  mensal para manter o acesso sem interrupções.
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
                    Ativar assinatura <ArrowRight size={16} />
                  </>
                )}
              </button>
            </section>
          ) : (
            <section className="attention-banner">
              <span>
                <AlertTriangle size={20} />
              </span>
              <div>
                <b>Assinatura inativa ou período expirado</b>
                <p>
                  Realize o pagamento da assinatura mensal para continuar
                  utilizando os recursos da plataforma.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleCheckout()}
                disabled={checkoutLoading}
              >
                <CreditCard size={16} /> Pagar assinatura
              </button>
            </section>
          )}

          {/* Grid de visualização no padrão exato de AdminPlans (.integration-grid + .dashboard-card.integration-card) */}
          <div className="integration-grid" style={{ marginBottom: "20px" }}>
            {/* Card 1: Visualização do Plano Atual e Benefícios */}
            <article className="dashboard-card integration-card">
              <header>
                <span>
                  {role === "MANAGER" ? (
                    <Landmark size={19} />
                  ) : (
                    <Building2 size={19} />
                  )}
                </span>
                <div className="plan-status-badges">
                  <em className="table-status">
                    <Sparkles size={12} /> {data.plan.formattedPrice}/mês
                  </em>
                  <em
                    className={`table-status ${
                      data.isActive
                        ? data.cancelAtPeriodEnd
                          ? ""
                          : "status-aprovada"
                        : data.isTrial
                          ? ""
                          : "status-recusada"
                    }`}
                  >
                    {data.isActive
                      ? data.cancelAtPeriodEnd
                        ? "● Ciclo final (Sem renovação)"
                        : "● Assinatura ativa"
                      : data.isTrial
                        ? `● Teste grátis (${data.daysRemaining}/${totalTrialDays}d)`
                        : "○ Inativa"}
                  </em>
                </div>
              </header>

              <h2>{data.plan.name}</h2>
              <p>{data.plan.description}</p>

              <dl>
                <div>
                  <dt>Valor mensal</dt>
                  <dd>
                    {data.plan.formattedPrice}/
                    {data.plan.interval === "year" ? "ano" : "mês"}
                  </dd>
                </div>
                <div>
                  <dt>
                    {data.cancelAtPeriodEnd
                      ? "Acesso garantido até"
                      : "Próximo faturamento"}
                  </dt>
                  <dd>{formatDateBrShort(data.nextBillingAt)}</dd>
                </div>
                <div>
                  <dt>Perfil da conta</dt>
                  <dd>{profileLabel}</dd>
                </div>
                <div>
                  <dt>
                    {data.isTrial ? "Dias restantes de teste" : "Situação do acesso"}
                  </dt>
                  <dd>
                    {data.isTrial
                      ? `${data.daysRemaining} de ${totalTrialDays} dias`
                      : data.canAccess
                        ? "Liberado até o fim do ciclo"
                        : "Bloqueado"}
                  </dd>
                </div>
              </dl>

              {data.plan.features.length > 0 && (
                <ul className="plan-features-preview">
                  {data.plan.features.map((feature, idx) => (
                    <li key={idx}>
                      <Check />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="integration-card__actions">
                {data.isActive && data.cancelAtPeriodEnd ? (
                  <>
                    <button
                      type="button"
                      className="table-action"
                      onClick={() => void handleOpenPortal()}
                      disabled={portalLoading}
                    >
                      <ExternalLink size={15} />
                      {portalLoading ? "Abrindo..." : "Ver histórico no portal"}
                    </button>
                    <button
                      type="button"
                      className="ds-button primary sm"
                      onClick={() => void handleCheckout()}
                      disabled={checkoutLoading}
                    >
                      {checkoutLoading ? (
                        <>
                          <RefreshCw size={15} className="spin" /> Abrindo...
                        </>
                      ) : (
                        <>
                          <CreditCard size={15} /> Pagar / Assinar novamente
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      style={{ fontSize: "var(--text-xs)", color: "#64748b" }}
                    >
                      Pagamentos, faturas e cancelamento no portal
                    </span>
                    <button
                      type="button"
                      className="ds-button primary sm"
                      onClick={() =>
                        void (data.isActive
                          ? handleOpenPortal()
                          : handleCheckout())
                      }
                      disabled={portalLoading || checkoutLoading}
                    >
                      {portalLoading || checkoutLoading ? (
                        <>
                          <RefreshCw size={15} className="spin" /> Abrindo...
                        </>
                      ) : (
                        <>
                          <ExternalLink size={15} />{" "}
                          {data.isActive
                            ? "Gerenciar assinatura"
                            : "Ativar assinatura"}
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </article>

            {/* Card 2: Visualização de Faturamento, Ciclo Vigente e Reativação */}
            <article className="dashboard-card integration-card">
              <header>
                <span>
                  <CalendarDays size={19} />
                </span>
                <div className="plan-status-badges">
                  <em
                    className={`table-status ${
                      data.cancelAtPeriodEnd ? "" : "status-aprovada"
                    }`}
                  >
                    {data.cancelAtPeriodEnd
                      ? "● Renovação pausada"
                      : "● Ciclo vigente"}
                  </em>
                </div>
              </header>

              <h2>
                {data.cancelAtPeriodEnd
                  ? "Fim do ciclo pago e reativação"
                  : "Próxima cobrança e regras do ciclo"}
              </h2>
              <p>
                {data.cancelAtPeriodEnd
                  ? "Você cancelou a renovação automática, mas mantém acesso integral até o fim do mês pago. Se desejar continuar, basta realizar uma nova assinatura."
                  : "Ao gerenciar ou cancelar sua assinatura no portal de pagamento, seu acesso permanece ativo até o término do período já pago."}
              </p>

              <dl>
                <div>
                  <dt>
                    {data.cancelAtPeriodEnd
                      ? "Término do ciclo pago"
                      : "Data da próxima cobrança"}
                  </dt>
                  <dd>{formatDateBrLong(data.nextBillingAt)}</dd>
                </div>
                <div>
                  <dt>Data de referência</dt>
                  <dd>{formatDateBrShort(data.nextBillingAt)}</dd>
                </div>
                <div>
                  <dt>Renovação automática</dt>
                  <dd>
                    {data.cancelAtPeriodEnd
                      ? "Cancelada (Encerra no fim do ciclo)"
                      : data.isActive
                        ? "Ativa (Mensal)"
                        : "Aguardando ativação"}
                  </dd>
                </div>
                <div>
                  <dt>Preservação de dados</dt>
                  <dd>Garantida (Sem exclusão)</dd>
                </div>
              </dl>

              <ul className="plan-features-preview">
                <li>
                  <Check />
                  <span>Permanência garantida durante todo o mês pago</span>
                </li>
                <li>
                  <Check />
                  <span>Cancelamento e troca de cartão pelo portal</span>
                </li>
                <li>
                  <Check />
                  <span>Opção de pagar novamente a qualquer momento</span>
                </li>
                <li>
                  <Check />
                  <span>Dados e histórico mantidos com segurança</span>
                </li>
              </ul>

              <div className="integration-card__actions">
                <button
                  type="button"
                  className="table-action"
                  onClick={() => void loadSubscription()}
                  disabled={loading}
                >
                  <RefreshCw size={15} className={loading ? "spin" : ""} />
                  Atualizar status
                </button>

                {data.cancelAtPeriodEnd || !data.isActive ? (
                  <button
                    type="button"
                    className="ds-button primary sm"
                    onClick={() => void handleCheckout()}
                    disabled={checkoutLoading}
                  >
                    <CreditCard size={15} />{" "}
                    {data.cancelAtPeriodEnd
                      ? "Pagar novamente"
                      : "Assinar agora"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ds-button secondary sm"
                    onClick={() => void handleOpenPortal()}
                    disabled={portalLoading}
                  >
                    <CreditCard size={15} /> Faturas e cartão
                  </button>
                )}
              </div>
            </article>
          </div>

          {/* Tabela de resumo no padrão exato de AdminPlans (.dashboard-card.admin-table-card.full-table) */}
          <section className="dashboard-card admin-table-card full-table">
            <div className="table-summary">
              <p>
                <b>Resumo da assinatura</b> — visualização de situação e próximo
                faturamento
              </p>
              <button
                onClick={() =>
                  void (data.isActive && !data.cancelAtPeriodEnd
                    ? handleOpenPortal()
                    : handleCheckout())
                }
                disabled={portalLoading || checkoutLoading}
              >
                {data.cancelAtPeriodEnd
                  ? "Pagar / Assinar novamente →"
                  : data.isActive
                    ? "Gerenciar assinatura →"
                    : "Ativar assinatura →"}
              </button>
            </div>

            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Plano Contratado</th>
                    <th>Situação Atual</th>
                    <th>Valor Mensal</th>
                    <th>
                      {data.cancelAtPeriodEnd
                        ? "Acesso Garantido Até"
                        : "Próximo Faturamento"}
                    </th>
                    <th>Renovação</th>
                    <th style={{ textAlign: "right" }}>Gerenciamento</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <span className="company-cell">
                        <i>{role === "MANAGER" ? "GP" : "ME"}</i>
                        <span>
                          <b>{data.plan.name}</b>
                          <small>Perfil: {profileLabel}</small>
                        </span>
                      </span>
                    </td>
                    <td>
                      <div className="admin-status-cell">
                        <em
                          className={`table-status ${
                            data.isActive
                              ? data.cancelAtPeriodEnd
                                ? ""
                                : "status-aprovada"
                              : data.isTrial
                                ? ""
                                : "status-recusada"
                          }`}
                        >
                          {data.isActive
                            ? data.cancelAtPeriodEnd
                              ? "● Ativa (Ciclo final)"
                              : "● Ativa"
                            : data.isTrial
                              ? `● Teste grátis (${data.daysRemaining}/${totalTrialDays}d)`
                              : data.status === "canceled"
                                ? "○ Cancelada"
                                : "○ Expirada"}
                        </em>
                        <small>
                          {data.isActive
                            ? data.cancelAtPeriodEnd
                              ? "Encerra ao fim do período pago"
                              : "Faturamento em dia"
                            : data.isTrial
                              ? `${data.daysRemaining} dia(s) restante(s)`
                              : "Acesso bloqueado"}
                        </small>
                      </div>
                    </td>
                    <td>
                      <b>{data.plan.formattedPrice}</b>
                      <small>
                        Ciclo{" "}
                        {data.plan.interval === "year" ? "anual" : "mensal"}
                      </small>
                    </td>
                    <td>
                      <b>{formatDateBrShort(data.nextBillingAt)}</b>
                      <small>{formatDateBrLong(data.nextBillingAt)}</small>
                    </td>
                    <td>
                      <b>
                        {data.cancelAtPeriodEnd
                          ? "Cancelada no fim do ciclo"
                          : data.isActive
                            ? "Automática"
                            : "Não iniciada"}
                      </b>
                      <small>Dados preservados na conta</small>
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        {data.isActive && data.cancelAtPeriodEnd && (
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => void handleCheckout()}
                            disabled={checkoutLoading}
                          >
                            Pagar novamente
                          </button>
                        )}
                        <button
                          type="button"
                          className="table-action"
                          onClick={() =>
                            void (data.isActive
                              ? handleOpenPortal()
                              : handleCheckout())
                          }
                          disabled={portalLoading || checkoutLoading}
                        >
                          {data.isActive
                            ? "Gerenciar no portal"
                            : "Ativar assinatura"}
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
