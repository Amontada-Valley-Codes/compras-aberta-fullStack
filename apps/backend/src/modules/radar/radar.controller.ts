import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../../utils/AppError";
import {
  syncSavedBidsSchema,
  updateRadarBidStateSchema,
  upsertRadarFilterSchema,
} from "./radar.schema";
import { radarService } from "./radar.service";

const radarController = {
  async getState(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new AppError("Não autenticado.", 401);
    const state = await radarService.getRadarState(request.user.id);
    return reply.status(200).send(state);
  },

  async createFilter(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new AppError("Não autenticado.", 401);
    const data = upsertRadarFilterSchema.parse(request.body);
    const created = await radarService.createFilter(request.user.id, data);
    return reply.status(201).send(created);
  },

  async updateFilter(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new AppError("Não autenticado.", 401);
    const { id } = request.params as { id: string };
    const data = upsertRadarFilterSchema.parse(request.body);
    const updated = await radarService.updateFilter(request.user.id, id, data);
    return reply.status(200).send(updated);
  },

  async deleteFilter(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new AppError("Não autenticado.", 401);
    const { id } = request.params as { id: string };
    const result = await radarService.deleteFilter(request.user.id, id);
    return reply.status(200).send(result);
  },

  async updateBidState(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new AppError("Não autenticado.", 401);
    const data = updateRadarBidStateSchema.parse(request.body);
    const result = await radarService.upsertBidState(request.user.id, data);
    return reply.status(200).send(result);
  },

  async syncSavedBids(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new AppError("Não autenticado.", 401);
    const data = syncSavedBidsSchema.parse(request.body);
    const result = await radarService.syncSavedBids(
      request.user.id,
      data.savedBidIds,
    );
    return reply.status(200).send(result);
  },
};

export { radarController };
