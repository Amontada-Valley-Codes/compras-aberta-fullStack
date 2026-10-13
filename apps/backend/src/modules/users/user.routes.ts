import type { FastifyInstance } from "fastify";

import { ensureAuthenticated } from "../../middlewares/ensure-authenticated";
import { userController } from "./user.controller";

async function userRoutes(app: FastifyInstance) {
  app.get(
    "/me",
    {
      onRequest: [ensureAuthenticated],
    },
    userController.me,
  );
}

export { userRoutes };
