import type { FastifyInstance } from "fastify";

import { sessionController } from "./session.controller";
import {
  createSessionDocs,
  logoutSessionDocs,
  refreshSessionDocs,
} from "./session.docs";

async function sessionRoutes(app: FastifyInstance) {
  app.post(
    "/sessions",
    {
      schema: createSessionDocs,
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    },
    sessionController.create,
  );

  app.post(
    "/sessions/refresh",
    {
      schema: refreshSessionDocs,
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    sessionController.refresh,
  );

  app.post(
    "/sessions/logout",
    {
      schema: logoutSessionDocs,
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    sessionController.logout,
  );
}

export { sessionRoutes };
