import type { FastifyInstance } from "fastify";
import { ensureAuthenticated } from "../../middlewares/ensure-authenticated";
import { verifyUserAuthorization } from "../../middlewares/verify-user-authorization";
import { planController } from "./plan.controller";

export async function planRoutes(app: FastifyInstance) {
  // Rota pública para listar planos na landing page e modais
  app.get("/plans", planController.listPublic);

  // Rotas restritas para Administradores
  app.get(
    "/admin/plans",
    {
      preHandler: [ensureAuthenticated, verifyUserAuthorization(["ADMIN"])],
    },
    planController.listAdmin
  );

  app.post(
    "/admin/plans",
    {
      preHandler: [ensureAuthenticated, verifyUserAuthorization(["ADMIN"])],
    },
    planController.create
  );

  app.put(
    "/admin/plans/:id",
    {
      preHandler: [ensureAuthenticated, verifyUserAuthorization(["ADMIN"])],
    },
    planController.update
  );

  app.delete(
    "/admin/plans/:id",
    {
      preHandler: [ensureAuthenticated, verifyUserAuthorization(["ADMIN"])],
    },
    planController.delete
  );
}
