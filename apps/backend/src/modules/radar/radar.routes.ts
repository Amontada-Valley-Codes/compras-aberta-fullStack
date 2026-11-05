import type { FastifyInstance } from "fastify";
import { ensureAuthenticated } from "../../middlewares/ensure-authenticated";
import { radarController } from "./radar.controller";

async function radarRoutes(app: FastifyInstance) {
  const auth = [ensureAuthenticated];

  app.get("/me/radar", { onRequest: auth }, radarController.getState);
  app.post(
    "/me/radar/filters",
    { onRequest: auth },
    radarController.createFilter,
  );
  app.put(
    "/me/radar/filters/:id",
    { onRequest: auth },
    radarController.updateFilter,
  );
  app.delete(
    "/me/radar/filters/:id",
    { onRequest: auth },
    radarController.deleteFilter,
  );
  app.put(
    "/me/radar/bids",
    { onRequest: auth },
    radarController.updateBidState,
  );
  app.post(
    "/me/radar/bids/sync",
    { onRequest: auth },
    radarController.syncSavedBids,
  );
}

export { radarRoutes };
