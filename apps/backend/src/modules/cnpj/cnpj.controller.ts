import type { FastifyReply, FastifyRequest } from "fastify";

import { findCnpjParamsSchema } from "./cnpj.schema";
import { cnpjService } from "./cnpj.service";

const cnpjController = {
  async find(request: FastifyRequest, reply: FastifyReply) {
    const params = findCnpjParamsSchema.parse(request.params);
    const company = await cnpjService.find(params);

    return reply.status(200).send(company);
  },
};

export { cnpjController };
