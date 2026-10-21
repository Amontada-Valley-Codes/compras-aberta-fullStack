import type { FastifyInstance } from "fastify";

import { cnpjController } from "./cnpj.controller";
import { findCnpjDocs } from "./cnpj.docs";

async function cnpjRoutes(app: FastifyInstance) {
  app.get(
    "/cnpj/:cnpj",
    {
      schema: findCnpjDocs,
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    cnpjController.find,
  );
}

export { cnpjRoutes };
