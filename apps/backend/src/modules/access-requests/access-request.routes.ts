import type { FastifyInstance } from "fastify";

import { ensureAuthenticated } from "../../middlewares/ensure-authenticated";
import { verifyUserAuthorization } from "../../middlewares/verify-user-authorization";
import { accessRequestController } from "./access-request.controller";
import {
  approveAccessRequestDocs,
  createAccessRequestDocs,
  findMyAccessRequestDocs,
  listAccessRequestsDocs,
  rejectAccessRequestDocs,
} from "./access-request.docs";

async function accessRequestRoutes(app: FastifyInstance) {
  const adminOnly = [ensureAuthenticated, verifyUserAuthorization(["ADMIN"])];

  app.post(
    "/access-requests",
    {
      schema: createAccessRequestDocs,
      config: { rateLimit: { max: 3, timeWindow: "10 minutes" } },
    },
    accessRequestController.create,
  );

  app.get(
    "/access-requests/me",
    { schema: findMyAccessRequestDocs, preHandler: [ensureAuthenticated] },
    accessRequestController.findMine,
  );

  app.get(
    "/access-requests",
    { schema: listAccessRequestsDocs, preHandler: adminOnly },
    accessRequestController.list,
  );

  app.patch(
    "/access-requests/:id/approve",
    { schema: approveAccessRequestDocs, preHandler: adminOnly },
    accessRequestController.approve,
  );

  app.patch(
    "/access-requests/:id/reject",
    { schema: rejectAccessRequestDocs, preHandler: adminOnly },
    accessRequestController.reject,
  );
}

export { accessRequestRoutes };
