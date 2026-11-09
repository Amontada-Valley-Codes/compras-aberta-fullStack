import type { FastifyReply, FastifyRequest } from "fastify";
import type Stripe from "stripe";
import { env } from "../../env";
import { stripe } from "../../lib/stripe";
import { AppError } from "../../utils/AppError";
import { paymentService } from "./payment.service";

export const paymentController = {
  async createCheckoutSession(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.id;
    if (!userId) {
      throw new AppError("Usuário não autenticado.", 401);
    }

    const { planId } = (request.body as { planId?: string } | undefined) || {};
    const origin = (request.headers.origin as string) || (request.headers.referer as string);
    const result = await paymentService.createCheckoutSession({
      userId,
      planId,
      origin,
    });

    return reply.status(200).send(result);
  },

  async createPortalSession(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.id;
    if (!userId) {
      throw new AppError("Usuário não autenticado.", 401);
    }

    const origin = (request.headers.origin as string) || (request.headers.referer as string);
    const result = await paymentService.createPortalSession({
      userId,
      origin,
    });

    return reply.status(200).send(result);
  },

  async getStatus(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.id;
    if (!userId) {
      throw new AppError("Usuário não autenticado.", 401);
    }

    const status = await paymentService.getSubscriptionStatus(userId);
    return reply.status(200).send(status);
  },

  async webhook(request: FastifyRequest, reply: FastifyReply) {
    const signature = request.headers["stripe-signature"] as string;

    let event: Stripe.Event;

    try {
      if (env.STRIPE_WEBHOOK_SECRET) {
        if (!signature) {
          throw new AppError("Assinatura do webhook ausente.", 400);
        }

        const rawBody = (request.body as Buffer) || Buffer.from(JSON.stringify(request.body));
        event = stripe.webhooks.constructEvent(
          rawBody,
          signature,
          env.STRIPE_WEBHOOK_SECRET
        );
      } else {
        // Modo de desenvolvimento sem webhook secret configurado
        event = (typeof request.body === "string" ? JSON.parse(request.body) : request.body) as Stripe.Event;
      }
    } catch (err: any) {
      console.error(`Erro ao validar assinatura do webhook Stripe: ${err.message}`);
      return reply.status(400).send(`Webhook Error: ${err.message}`);
    }

    await paymentService.handleWebhook(event);

    return reply.status(200).send({ received: true });
  },
};
