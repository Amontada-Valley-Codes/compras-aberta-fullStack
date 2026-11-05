import type { FastifyInstance } from "fastify";
import { ensureAuthenticated } from "../../middlewares/ensure-authenticated";
import { workspaceController } from "./workspace.controller";

async function workspaceRoutes(app: FastifyInstance) {
  const auth = [ensureAuthenticated];

  app.get("/me/workspace", { onRequest: auth }, workspaceController.getWorkspace);
  app.put(
    "/me/workspace/bids",
    { onRequest: auth },
    workspaceController.upsertTrackedBid,
  );
  app.delete(
    "/me/workspace/bids",
    { onRequest: auth },
    workspaceController.deleteTrackedBid,
  );
  app.delete(
    "/me/workspace/bids/:bidControlId",
    { onRequest: auth },
    workspaceController.deleteTrackedBid,
  );
  app.post(
    "/me/workspace/reminders",
    { onRequest: auth },
    workspaceController.createReminder,
  );
  app.put(
    "/me/workspace/reminders/:id",
    { onRequest: auth },
    workspaceController.updateReminder,
  );
  app.delete(
    "/me/workspace/reminders/:id",
    { onRequest: auth },
    workspaceController.deleteReminder,
  );
}

export { workspaceRoutes };
