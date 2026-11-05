import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../../utils/AppError";
import {
  createReminderSchema,
  updateReminderSchema,
  upsertTrackedBidSchema,
} from "./workspace.schema";
import { workspaceService } from "./workspace.service";

const workspaceController = {
  async getWorkspace(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new AppError("Não autenticado.", 401);
    const data = await workspaceService.getWorkspace(request.user.id);
    return reply.status(200).send(data);
  },

  async upsertTrackedBid(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new AppError("Não autenticado.", 401);
    const input = upsertTrackedBidSchema.parse(request.body);
    const saved = await workspaceService.upsertTrackedBid(
      request.user.id,
      input,
    );
    return reply.status(200).send(saved);
  },

  async deleteTrackedBid(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new AppError("Não autenticado.", 401);
    const params = (request.params ?? {}) as { bidControlId?: string };
    const query = (request.query ?? {}) as { bidControlId?: string };
    const rawId = query.bidControlId ?? params.bidControlId ?? "";
    if (!rawId) {
      throw new AppError("Informe o identificador da licitação.", 400);
    }
    const result = await workspaceService.deleteTrackedBid(
      request.user.id,
      decodeURIComponent(rawId),
    );
    return reply.status(200).send(result);
  },

  async createReminder(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new AppError("Não autenticado.", 401);
    const input = createReminderSchema.parse(request.body);
    const created = await workspaceService.createReminder(
      request.user.id,
      input,
    );
    return reply.status(201).send(created);
  },

  async updateReminder(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new AppError("Não autenticado.", 401);
    const { id } = request.params as { id: string };
    const input = updateReminderSchema.parse(request.body);
    const updated = await workspaceService.updateReminder(
      request.user.id,
      id,
      input,
    );
    return reply.status(200).send(updated);
  },

  async deleteReminder(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new AppError("Não autenticado.", 401);
    const { id } = request.params as { id: string };
    const result = await workspaceService.deleteReminder(request.user.id, id);
    return reply.status(200).send(result);
  },
};

export { workspaceController };
