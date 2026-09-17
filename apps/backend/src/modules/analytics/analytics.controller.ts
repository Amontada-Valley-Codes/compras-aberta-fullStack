import type { FastifyReply, FastifyRequest } from "fastify";

import {
  getMicroenterpriseIndicatorQuerySchema,
  listDetailedBidsQuerySchema,
  listExpensesByNatureQuerySchema,
  listLocalMicroenterpriseParticipationsQuerySchema,
  listMicroenterpriseParticipationByNatureQuerySchema,
} from "./analytics.schema";
import { analyticsService } from "./analytics.service";

const analyticsController = {
  async listDetailedBids(request: FastifyRequest, reply: FastifyReply) {
    const filters = listDetailedBidsQuerySchema.parse(request.query);
    const data = await analyticsService.listDetailedBids(filters);

    return reply.status(200).send(data);
  },

  async listLocalMicroenterpriseParticipations(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const filters = listLocalMicroenterpriseParticipationsQuerySchema.parse(
      request.query,
    );
    const data = await analyticsService.listLocalMicroenterpriseParticipations(
      filters,
    );

    return reply.status(200).send(data);
  },

  async listExpensesByNature(request: FastifyRequest, reply: FastifyReply) {
    const filters = listExpensesByNatureQuerySchema.parse(request.query);
    const data = await analyticsService.listExpensesByNature(filters);

    return reply.status(200).send(data);
  },

  async getMicroenterpriseIndicator(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const filters = getMicroenterpriseIndicatorQuerySchema.parse(
      request.query,
    );
    const data = await analyticsService.getMicroenterpriseIndicator(filters);

    return reply.status(200).send(data);
  },

  async listMicroenterpriseParticipationByNature(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const filters = listMicroenterpriseParticipationByNatureQuerySchema.parse(
      request.query,
    );
    const data =
      await analyticsService.listMicroenterpriseParticipationByNature(filters);

    return reply.status(200).send(data);
  },
};

export { analyticsController };
