import type { FastifyInstance } from "fastify";

import { sessionController } from "./session.controller";

async function sessionRoutes(app: FastifyInstance) {
  app.post("/sessions", sessionController.create);
}

export { sessionRoutes };
