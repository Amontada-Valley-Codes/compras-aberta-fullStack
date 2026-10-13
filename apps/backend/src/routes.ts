import type { FastifyInstance } from "fastify";
import { accessRequestRoutes } from "./modules/access-requests/access-request.routes";
import { analyticsRoutes } from "./modules/analytics/analytics.routes";
import { cnpjRoutes } from "./modules/cnpj/cnpj.routes";
import { municipioRoutes } from "./modules/municipios/municipio.routes";
import { sessionRoutes } from "./modules/sessions/session.routes";
import { businessRoutes } from "./modules/business/business.routes";
import { adminRoutes } from "./modules/admin/admin.routes";
import { userRoutes } from "./modules/users/user.routes";

// O cadastro de usuário BUSINESS acontece só por POST /access-requests, que
// cria a conta já vinculada a uma solicitação pendente de aprovação.
async function routes(app: FastifyInstance) {
  await app.register(accessRequestRoutes);
  await app.register(sessionRoutes);
  await app.register(businessRoutes);
  await app.register(municipioRoutes);
  await app.register(cnpjRoutes);
  await app.register(analyticsRoutes);
  await app.register(adminRoutes);
  await app.register(userRoutes);
}

export { routes };
