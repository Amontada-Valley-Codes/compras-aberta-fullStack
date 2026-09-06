import type { FastifyInstance } from "fastify";

import { userController } from "./user.controller";

async function userRoutes(app: FastifyInstance) {
  app.post("/users", userController.create);
}

export { userRoutes };