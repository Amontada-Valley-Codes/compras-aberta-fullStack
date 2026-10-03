import type { FastifyInstance } from "fastify";
import { analyticsRoutes } from "./modules/analytics/analytics.routes";
import { businessRoutes } from "./modules/business/business.routes";
import { municipioRoutes } from "./modules/municipios/municipio.routes";
import { sessionRoutes } from "./modules/sessions/session.routes";
import { userRoutes } from "./modules/users/user.routes";
import { adminRoutes } from "./modules/admin/admin.routes";

async function routes(app: FastifyInstance) {
  await app.register(userRoutes);
  await app.register(sessionRoutes);
  await app.register(businessRoutes);
  await app.register(municipioRoutes);
  await app.register(analyticsRoutes);
  await app.register(adminRoutes);
}

export { routes };
