import type { FastifyInstance } from "fastify";

import { sessionController } from "./session.controller";
import { createSessionDocs } from "./session.docs";

async function sessionRoutes(app: FastifyInstance) {
  app.post(
    "/sessions",
    {
      schema: createSessionDocs,
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    },
    sessionController.create,
  );
}

export { sessionRoutes };
