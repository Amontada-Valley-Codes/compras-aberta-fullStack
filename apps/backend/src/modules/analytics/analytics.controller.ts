import type { FastifyReply, FastifyRequest } from "fastify";

import {
  otherSizesPaymentsQuerySchema,
  paymentsSummaryQuerySchema,
  municipalityCatalogQuerySchema,
  paymentSuppliersQuerySchema,
  getMicroenterpriseIndicatorQuerySchema,
  listDetailedBidsQuerySchema,
  listExpensesByNatureQuerySchema,
  listGeneralMicroenterpriseParticipationsQuerySchema,
  listLocalMicroenterpriseParticipationsQuerySchema,
  listMicroenterpriseParticipationByNatureQuerySchema,
} from "./analytics.schema";
import { analyticsService } from "./analytics.service";

const analyticsController = {
  async listMunicipalityCatalog(request: FastifyRequest, reply: FastifyReply) {
    const filters = municipalityCatalogQuerySchema.parse(request.query);
    return reply.status(200).send(await analyticsService.listMunicipalityCatalog(filters));
  },
  async getPaymentsSummary(request: FastifyRequest, reply: FastifyReply) {
    const filters = paymentsSummaryQuerySchema.parse(request.query);
    return reply.status(200).send(await analyticsService.getPaymentsSummary(filters));
  },
  async listPaymentSuppliers(request: FastifyRequest, reply: FastifyReply) {
    const filters = paymentSuppliersQuerySchema.parse(request.query);
    return reply.status(200).send(await analyticsService.listPaymentSuppliers(filters));
  },
  async getOtherSizesPayments(request: FastifyRequest, reply: FastifyReply) {
    const filters = otherSizesPaymentsQuerySchema.parse(request.query);
    return reply.status(200).send(await analyticsService.getOtherSizesPayments(filters));
  },
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

  async listGeneralMicroenterpriseParticipations(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const filters = listGeneralMicroenterpriseParticipationsQuerySchema.parse(
      request.query,
    );
    const data =
      await analyticsService.listGeneralMicroenterpriseParticipations(filters);

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
