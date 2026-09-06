import type { FastifyInstance } from "fastify";
import { userRoutes } from "./modules/users/user.routes";

async function routes(app: FastifyInstance) {
  await app.register(userRoutes);
}

export { routes };