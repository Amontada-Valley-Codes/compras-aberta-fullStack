import type { FastifyReply, FastifyRequest } from "fastify";

import { createSessionSchema } from "./session.schema";
import { sessionService } from "./session.service";

const sessionController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createSessionSchema.parse(request.body);
    const session = await sessionService.create(data);

    return reply.status(200).send(session);
  },
};

export { sessionController };
