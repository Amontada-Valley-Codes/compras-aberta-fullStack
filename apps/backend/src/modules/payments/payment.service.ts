import type Stripe from "stripe";
import { env } from "../../env";
import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/stripe";
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

export const paymentService = {
  async createCheckoutSession({ userId, planId, origin }: CreateCheckoutInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    let customerId = user.stripeCustomerId;

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

    let priceId = env.STRIPE_PRICE_ID_MONTHLY;

    if (planId) {
      const plan = await prisma.plan.findUnique({ where: { id: planId } });
      if (plan?.stripePriceId) {
        priceId = plan.stripePriceId;
      }
    } else {
      const defaultPlan = await prisma.plan.findFirst({
        where: { targetRole: user.role, isActive: true },
        orderBy: { isFeatured: "desc" },
      });
      if (defaultPlan?.stripePriceId) {
        priceId = defaultPlan.stripePriceId;
      }
    }

    const baseUrl = origin || env.FRONTEND_URL || "http://localhost:3000";

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
        planId: planId || "",
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planId: planId || "",
        },
      },
      success_url: `${baseUrl}/me?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/me?checkout=cancelled`,
    });

    if (!session.url) {
      throw new AppError("Não foi possível gerar a sessão de checkout do Stripe.", 500);
    }

    return { url: session.url };
  },

  async createPortalSession({ userId, origin }: CreatePortalInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.stripeCustomerId) {
      throw new AppError("Nenhuma assinatura ou cliente encontrado para este usuário.", 400);
    }

    const baseUrl = origin || env.FRONTEND_URL || "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/me`,
    });

    return { url: portalSession.url };
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
      },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    const now = new Date();
    const isTrial =
      user.subscriptionStatus === "trialing" &&
      !!user.trialEndsAt &&
      user.trialEndsAt > now;

    const isTrialExpired =
      user.subscriptionStatus === "trialing" &&
      (!user.trialEndsAt || user.trialEndsAt <= now);

    const isActive = user.subscriptionStatus === "active";

    const daysRemaining = user.trialEndsAt
      ? Math.max(
          0,
          Math.ceil((user.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        )
      : 0;

    return {
      status: isTrialExpired ? "trial_expired" : user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt,
      isTrial,
      isActive,
      daysRemaining,
      canAccess: isActive || isTrial || user.role === "ADMIN",
      planName: "Assinatura Compras Abertas (R$ 23,99/mês)",
      hasCustomerPortal: !!user.stripeCustomerId,
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
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status === "active" ? "active" : subscription.status;

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
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            subscriptionStatus: "canceled",
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
