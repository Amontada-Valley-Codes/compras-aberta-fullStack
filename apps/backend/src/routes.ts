import type { FastifyInstance } from "fastify";
import { municipioRoutes } from "./modules/municipios/municipio.routes";
import { sessionRoutes } from "./modules/sessions/session.routes";
import { userRoutes } from "./modules/users/user.routes";

async function routes(app: FastifyInstance) {
  await app.register(userRoutes);
  await app.register(sessionRoutes);
  await app.register(municipioRoutes);
}

export { routes };
