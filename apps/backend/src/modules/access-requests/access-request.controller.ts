import type { FastifyReply, FastifyRequest } from "fastify";

import {
  accessRequestParamsSchema,
  approveAccessRequestSchema,
  createAccessRequestSchema,
  listAccessRequestsSchema,
  rejectAccessRequestSchema,
} from "./access-request.schema";
import { accessRequestService } from "./access-request.service";

const accessRequestController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createAccessRequestSchema.parse(request.body);
    const accessRequest = await accessRequestService.create(data);

    return reply.status(201).send(accessRequest);
  },

  // request.user é preenchido pelo ensureAuthenticated, que roda antes.
  async findMine(request: FastifyRequest, reply: FastifyReply) {
    const accessRequest = await accessRequestService.findMine(request.user!.id);

    return reply.status(200).send(accessRequest);
  },

  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listAccessRequestsSchema.parse(request.query);
    const accessRequests = await accessRequestService.list(query);

    return reply.status(200).send(accessRequests);
  },

  async approve(request: FastifyRequest, reply: FastifyReply) {
    const { id } = accessRequestParamsSchema.parse(request.params);
    const { note } = approveAccessRequestSchema.parse(request.body ?? {});
    const accessRequest = await accessRequestService.approve(
      id,
      request.user!.id,
      note,
    );

    return reply.status(200).send(accessRequest);
  },

  async reject(request: FastifyRequest, reply: FastifyReply) {
    const { id } = accessRequestParamsSchema.parse(request.params);
    const { note } = rejectAccessRequestSchema.parse(request.body);
    const accessRequest = await accessRequestService.reject(
      id,
      request.user!.id,
      note,
    );

    return reply.status(200).send(accessRequest);
  },
};

export { accessRequestController };
