import type { FastifyInstance } from "fastify";
import { ensureAuthenticated } from "../../middlewares/ensure-authenticated";
import { paymentController } from "./payment.controller";

export async function paymentRoutes(app: FastifyInstance) {
  // Adiciona parser para o webhook receber Buffer e demais rotas JSON
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req, body, done) => {
      if (req.url.includes("/payments/webhook")) {
        done(null, body);
      } else {
        try {
          const json = JSON.parse(body.toString("utf8"));
          done(null, json);
        } catch (err: any) {
          done(err, undefined);
        }
      }
    }
  );

  app.post(
    "/payments/checkout-session",
    { preHandler: [ensureAuthenticated] },
    paymentController.createCheckoutSession
  );

  app.post(
    "/payments/portal-session",
    { preHandler: [ensureAuthenticated] },
    paymentController.createPortalSession
  );

  app.get(
    "/payments/status",
    { preHandler: [ensureAuthenticated] },
    paymentController.getStatus
  );

  app.post(
    "/payments/webhook",
    paymentController.webhook
  );
}
