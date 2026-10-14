import type { FastifyInstance } from "fastify";
import { ensureAuthenticated } from "../../middlewares/ensure-authenticated";
import { verifyUserAuthorization } from "../../middlewares/verify-user-authorization";
import { userController } from "./user.controller";

async function userRoutes(app: FastifyInstance) {
  const adminOnly = [ensureAuthenticated, verifyUserAuthorization(["ADMIN"])];

  app.get(
    "/me",
    {
      onRequest: [ensureAuthenticated],
    },
    userController.me,
  );

  app.get(
    "/admin/users",
    {
      onRequest: adminOnly,
    },
    userController.listAdmins,
  );

  app.post(
    "/admin/users",
    {
      onRequest: adminOnly,
    },
    userController.createAdmin,
  );

  app.delete(
    "/admin/users/:id",
    {
      onRequest: adminOnly,
    },
    userController.deleteAdmin,
  );
}

export { userRoutes };
