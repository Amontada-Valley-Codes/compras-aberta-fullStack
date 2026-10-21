import type { FastifyReply, FastifyRequest } from "fastify";

import { createSessionSchema, refreshSessionSchema } from "./session.schema";
import { sessionService } from "./session.service";

const sessionController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createSessionSchema.parse(request.body);
    const session = await sessionService.create(data);

    return reply.status(200).send(session);
  },

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const { refreshToken } = refreshSessionSchema.parse(request.body);
    const session = await sessionService.refresh(refreshToken);

    return reply.status(200).send(session);
  },

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const { refreshToken } = refreshSessionSchema.parse(request.body);
    await sessionService.logout(refreshToken);

    return reply.status(204).send();
  },
};

export { sessionController };
