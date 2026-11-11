import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { planService } from "./plan.service";

const planFeaturesSchema = z.array(z.string());

const createPlanSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  targetRole: z.enum(["BUSINESS", "MANAGER", "ADMIN"]).default("BUSINESS"),
  priceCents: z.number().int().min(0, "Preço em centavos deve ser maior ou igual a 0"),
  interval: z.enum(["month", "year"]).default("month"),
  trialDays: z.number().int().min(0).default(7),
  description: z.string().optional(),
  features: planFeaturesSchema.default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

const updatePlanSchema = createPlanSchema.partial();

export const planController = {
  async listPublic(_request: FastifyRequest, reply: FastifyReply) {
    const plans = await planService.listActive();
    return reply.status(200).send(plans);
  },

  async listAdmin(_request: FastifyRequest, reply: FastifyReply) {
    const plans = await planService.listAll();
    return reply.status(200).send(plans);
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createPlanSchema.parse(request.body);
    const plan = await planService.create(data);
    return reply.status(201).send(plan);
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = updatePlanSchema.parse(request.body);
    const updated = await planService.update(id, data);
    return reply.status(200).send(updated);
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const plan = await planService.delete(id);
    return reply.status(200).send(plan);
  },
};
