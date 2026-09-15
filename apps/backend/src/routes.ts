import type { FastifyInstance } from "fastify";
import { sessionRoutes } from "./modules/sessions/session.routes";
import { userRoutes } from "./modules/users/user.routes";

async function routes(app: FastifyInstance) {
  await app.register(userRoutes);
  await app.register(sessionRoutes);
}

export { routes };
