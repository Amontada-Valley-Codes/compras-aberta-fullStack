import type { FastifyInstance } from "fastify";

import { municipioController } from "./municipio.controller";
import { listMunicipiosDocs } from "./municipio.docs";

async function municipioRoutes(app: FastifyInstance) {
  app.get(
    "/municipios",
    { schema: listMunicipiosDocs },
    municipioController.list,
  );
}

export { municipioRoutes };
