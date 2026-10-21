import type { FastifyReply, FastifyRequest } from "fastify";

import { listMunicipiosQuerySchema } from "./municipio.schema";
import { municipioService } from "./municipio.service";

const municipioController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listMunicipiosQuerySchema.parse(request.query);
    const municipios = await municipioService.list(query);

    return reply.status(200).send(municipios);
  },
};

export { municipioController };
