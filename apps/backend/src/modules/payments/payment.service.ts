import type Stripe from "stripe";
import { env } from "../../env";
import { prisma } from "../../lib/prisma";
import { isStripeConfigured, stripe } from "../../lib/stripe";
import { AppError } from "../../utils/AppError";

interface CreateCheckoutInput {
  userId: string;
  planId?: string;
  origin?: string;
}

interface CreatePortalInput {
  userId: string;
  origin?: string;
}

function resolveBaseUrl(origin?: string): string {
  const fallback = env.FRONTEND_URL || "http://localhost:3000";
  if (!origin) return fallback;
  try {
    return new URL(origin).origin;
  } catch {
    return fallback;
  }
}

export const paymentService = {
  async createCheckoutSession({ userId, planId, origin }: CreateCheckoutInput) {
    if (!isStripeConfigured) {
      throw new AppError(
        "O serviço de pagamentos (STRIPE_SECRET_KEY) não está configurado neste ambiente.",
        503,
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    let customerId = user.stripeCustomerId;

    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if ("deleted" in existing && existing.deleted) {
          customerId = null;
        }
      } catch {
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user.id,
        },
      });

      customerId = customer.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    let selectedPlan = planId
      ? await prisma.plan.findUnique({ where: { id: planId } })
      : await prisma.plan.findFirst({
          where: { targetRole: user.role, isActive: true },
          orderBy: { isFeatured: "desc" },
        });

    if (!selectedPlan) {
      selectedPlan = await prisma.plan.findFirst({
        where: { isActive: true, priceCents: { gt: 0 }, targetRole: { not: "PUBLIC" } },
        orderBy: { isFeatured: "desc" },
      });
    }

    let priceId = selectedPlan?.stripePriceId || env.STRIPE_PRICE_ID_MONTHLY;

    // Verifica se o Price existe na Stripe; caso contrário, cria Produto + Preço automaticamente
    let priceValid = false;
    if (priceId && priceId.startsWith("price_")) {
      try {
        const retrievedPrice = await stripe.prices.retrieve(priceId);
        priceValid = Boolean(retrievedPrice && retrievedPrice.active);
      } catch {
        priceValid = false;
      }
    }

    if (!priceValid) {
      const planName =
        selectedPlan?.name ||
        (user.role === "MANAGER" ? "Gestor Público" : "Empresas em Geral");
      const unitAmount = selectedPlan?.priceCents ?? 2399;

      const product = await stripe.products.create({
        name: `Compras Abertas — ${planName}`,
        description:
          selectedPlan?.description ||
          "Assinatura mensal da plataforma Compras Abertas",
      });

      const createdPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: unitAmount,
        currency: "brl",
        recurring: { interval: "month" },
      });

      priceId = createdPrice.id;

      if (selectedPlan) {
        await prisma.plan.update({
          where: { id: selectedPlan.id },
          data: {
            stripeProductId: product.id,
            stripePriceId: createdPrice.id,
          },
        });
      }
    }

    const baseUrl = resolveBaseUrl(origin);
    const dashboardPath = user.role === "MANAGER" ? "/gestor/assinatura" : "/empresa";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      allow_promotion_codes: true,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        planId: selectedPlan?.id || planId || "",
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planId: selectedPlan?.id || planId || "",
        },
      },
      success_url: `${baseUrl}${dashboardPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${dashboardPath}?checkout=cancelled`,
    });

    if (!session.url) {
      throw new AppError("Não foi possível gerar a sessão de pagamento.", 500);
    }

    return { url: session.url };
  },

  async createPortalSession({ userId, origin }: CreatePortalInput) {
    if (!isStripeConfigured) {
      throw new AppError(
        "O serviço de pagamentos (STRIPE_SECRET_KEY) não está configurado neste ambiente.",
        503,
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    let customerId = user.stripeCustomerId;

    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if ("deleted" in existing && existing.deleted) {
          customerId = null;
        }
      } catch {
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    const baseUrl = resolveBaseUrl(origin);
    const dashboardPath = user.role === "MANAGER" ? "/gestor/assinatura" : "/empresa";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}${dashboardPath}`,
    });

    return { url: portalSession.url };
  },

  async cancelSubscription({ userId }: { userId: string }) {
    if (!isStripeConfigured) {
      throw new AppError(
        "O serviço de pagamentos não está configurado neste ambiente.",
        503,
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    // Agenda o cancelamento para o fim do período vigente pago (padrão SaaS)
    if (user.stripeSubscriptionId) {
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    return {
      status: "active",
      cancelAtPeriodEnd: true,
      message:
        "Renovação automática cancelada. Seu acesso permanece liberado até o fim do período vigente já pago.",
    };
  },

  async getSubscriptionStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    const now = new Date();
    let subscriptionStatus = user.subscriptionStatus;
    let trialEndsAt = user.trialEndsAt;
    let nextBillingAt: string | null = null;
    let cancelAtPeriodEnd = false;

    // Sincroniza status, data da próxima cobrança e agendamento de cancelamento no fim do ciclo
    if (isStripeConfigured && user.stripeCustomerId) {
      try {
        const subs = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: "all",
          limit: 1,
        });
        if (subs.data.length > 0) {
          const latestSub = subs.data[0] as any;
          const periodEnd =
            latestSub.current_period_end ??
            latestSub.items?.data?.[0]?.current_period_end;
          const periodEndDate =
            typeof periodEnd === "number" ? new Date(periodEnd * 1000) : null;

          if (latestSub.status === "active" || latestSub.status === "trialing") {
            if (subscriptionStatus !== "active") {
              subscriptionStatus = "active";
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  subscriptionStatus: "active",
                  stripeSubscriptionId: latestSub.id,
                },
              });
            }
            if (periodEndDate) {
              nextBillingAt = periodEndDate.toISOString();
            }
            cancelAtPeriodEnd = Boolean(
              latestSub.cancel_at_period_end || latestSub.cancel_at,
            );
          } else if (latestSub.status === "canceled") {
            // Se ainda estiver dentro do mês já pago, mantém ativo até o fim do ciclo; se já passou, bloqueia com status "canceled"
            if (periodEndDate && periodEndDate > now) {
              subscriptionStatus = "active";
              cancelAtPeriodEnd = true;
              nextBillingAt = periodEndDate.toISOString();
            } else if (subscriptionStatus !== "canceled") {
              subscriptionStatus = "canceled";
              await prisma.user.update({
                where: { id: user.id },
                data: { subscriptionStatus: "canceled" },
              });
            }
          }
        }
      } catch {
        // Ignora erro de rede ao consultar provedor de pagamento
      }
    }

    // Usuários antigos criados antes da coluna trialEndsAt recebem 7 dias de demonstração
    if (subscriptionStatus === "trialing" && !trialEndsAt) {
      trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: user.id },
        data: { trialEndsAt },
      });
    }

    // Quando os dias de teste grátis chegam ao fim, atualiza o status no banco para "expired" (sem excluir dados)
    if (
      subscriptionStatus === "trialing" &&
      trialEndsAt &&
      trialEndsAt <= now
    ) {
      subscriptionStatus = "expired";
      await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: "expired" },
      });
    }

    const isTrial =
      subscriptionStatus === "trialing" &&
      !!trialEndsAt &&
      trialEndsAt > now;

    const isTrialExpired =
      subscriptionStatus === "expired" ||
      (subscriptionStatus === "trialing" && !!trialEndsAt && trialEndsAt <= now);

    const isActive = subscriptionStatus === "active";

    // Define a data do próximo faturamento (próxima cobrança)
    if (isActive && !nextBillingAt) {
      const cycleAnchor = new Date(user.createdAt);
      const nextCycle = new Date(now);
      nextCycle.setDate(cycleAnchor.getDate());
      if (nextCycle <= now) {
        nextCycle.setMonth(nextCycle.getMonth() + 1);
      }
      nextBillingAt = nextCycle.toISOString();
    } else if (isTrial && trialEndsAt) {
      nextBillingAt = trialEndsAt.toISOString();
    }

    const daysRemaining = trialEndsAt
      ? Math.max(
          0,
          Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        )
      : 0;

    const targetPlan = await prisma.plan.findFirst({
      where: { targetRole: user.role, isActive: true },
      orderBy: { isFeatured: "desc" },
    });

    const formattedPrice = targetPlan
      ? (targetPlan.priceCents / 100).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })
      : "R$ 23,99";

    const defaultFeatures =
      user.role === "MANAGER"
        ? [
            "Painel analítico completo de compras públicas municipais",
            "Indicadores de participação de ME, MEI e EPP",
            "Comparativos regionais e exportação de relatórios",
            "Suporte técnico dedicado ao gestor público",
          ]
        : [
            "Monitoramento completo de licitações e editais do PNCP",
            "Radar inteligente compatível com o CNAE da empresa",
            "Gestão de documentos, certidões e agenda de disputas",
            "Suporte técnico prioritário",
          ];

    return {
      status: isTrialExpired ? "expired" : subscriptionStatus,
      trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
      nextBillingAt,
      cancelAtPeriodEnd,
      isTrial,
      isActive,
      daysRemaining,
      canAccess:
        (isActive || isTrial || user.role === "ADMIN") &&
        subscriptionStatus !== "canceled" &&
        !isTrialExpired,
      planName: targetPlan
        ? `${targetPlan.name} (${formattedPrice}/mês)`
        : `Assinatura Mensal (${formattedPrice}/mês)`,
      plan: {
        id: targetPlan?.id ?? null,
        name:
          targetPlan?.name ??
          (user.role === "MANAGER" ? "Gestor Público" : "Empresas em Geral"),
        description:
          targetPlan?.description ??
          "Acesso completo a todos os recursos e indicadores da plataforma.",
        priceCents: targetPlan?.priceCents ?? 2399,
        formattedPrice,
        interval: targetPlan?.interval ?? "month",
        trialDays: targetPlan?.trialDays ?? 7,
        features:
          Array.isArray(targetPlan?.features) && targetPlan.features.length > 0
            ? (targetPlan.features as string[])
            : defaultFeatures,
      },
      hasCustomerPortal: Boolean(isStripeConfigured && user.stripeCustomerId),
    };
  },

  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionStatus: "active",
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              stripePriceId: env.STRIPE_PRICE_ID_MONTHLY,
            },
          });
        } else if (customerId) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: {
              subscriptionStatus: "active",
              stripeSubscriptionId: subscriptionId,
              stripePriceId: env.STRIPE_PRICE_ID_MONTHLY,
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;
        const periodEnd =
          subscription.current_period_end ??
          subscription.items?.data?.[0]?.current_period_end;
        const stillInPaidPeriod =
          typeof periodEnd === "number" && periodEnd * 1000 > Date.now();

        const status =
          subscription.status === "active" ||
          (subscription.status === "canceled" && stillInPaidPeriod)
            ? "active"
            : subscription.status;

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            subscriptionStatus: status,
            stripeSubscriptionId: subscription.id,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;
        const periodEnd =
          subscription.current_period_end ??
          subscription.items?.data?.[0]?.current_period_end;
        const stillInPaidPeriod =
          typeof periodEnd === "number" && periodEnd * 1000 > Date.now();

        // Se ainda houver dias pagos no ciclo vigente, mantém "active" até o fim do período; caso contrário, marca como "canceled" (sem excluir dados)
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            subscriptionStatus: stillInPaidPeriod ? "active" : "canceled",
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            subscriptionStatus: "past_due",
          },
        });
        break;
      }

      default:
        break;
    }
  },
};
