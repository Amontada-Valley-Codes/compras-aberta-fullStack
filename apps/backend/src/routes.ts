import type { FastifyInstance } from "fastify";
import { accessRequestRoutes } from "./modules/access-requests/access-request.routes";
import { analyticsRoutes } from "./modules/analytics/analytics.routes";
import { cnpjRoutes } from "./modules/cnpj/cnpj.routes";
import { municipioRoutes } from "./modules/municipios/municipio.routes";
import { sessionRoutes } from "./modules/sessions/session.routes";
import { businessRoutes } from "./modules/business/business.routes";
import { adminRoutes } from "./modules/admin/admin.routes";
import { userRoutes } from "./modules/users/user.routes";
import { radarRoutes } from "./modules/radar/radar.routes";
import { workspaceRoutes } from "./modules/workspace/workspace.routes";
import { paymentRoutes } from "./modules/payments/payment.routes";
import { planRoutes } from "./modules/plans/plan.routes";

// O cadastro de usuário BUSINESS acontece só por POST /access-requests, que
// cria a conta já vinculada a uma solicitação pendente de aprovação. O gestor
// público (MANAGER) se cadastra por POST /managers/register, sem aprovação.
async function routes(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok", api: "ok" }));
  app.get("/api/health", async () => ({ status: "ok", api: "ok" }));

  await app.register(accessRequestRoutes);
  await app.register(sessionRoutes);
  await app.register(businessRoutes);
  await app.register(municipioRoutes);
  await app.register(cnpjRoutes);
  await app.register(analyticsRoutes);
  await app.register(adminRoutes);
  await app.register(userRoutes);
  await app.register(radarRoutes);
  await app.register(workspaceRoutes);
  await app.register(paymentRoutes);
  await app.register(planRoutes);
}

export { routes };
