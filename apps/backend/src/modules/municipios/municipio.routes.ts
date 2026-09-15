import type { FastifyInstance } from "fastify";

import { municipioController } from "./municipio.controller";

async function municipioRoutes(app: FastifyInstance) {
  app.get("/municipios", municipioController.list);
}

export { municipioRoutes };
