import type { FastifyInstance } from "fastify";

import { ensureAuthenticated } from "../../middlewares/ensure-authenticated";
import { userController } from "./user.controller";
import { createUserDocs } from "./user.docs";

async function userRoutes(app: FastifyInstance) {
  app.post(
    "/users",
    {
      schema: createUserDocs,
      config: { rateLimit: { max: 3, timeWindow: "10 minutes" } },
    },
    userController.create,
  );

  app.get(
    "/me",
    {
      onRequest: [ensureAuthenticated],
    },
    userController.me,
  );
}

export { userRoutes };
