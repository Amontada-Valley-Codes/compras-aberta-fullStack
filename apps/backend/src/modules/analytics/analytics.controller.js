"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsController = void 0;
const analytics_schema_1 = require("./analytics.schema");
const analytics_service_1 = require("./analytics.service");
const analyticsController = {
    async listDetailedBids(request, reply) {
        const filters = analytics_schema_1.listDetailedBidsQuerySchema.parse(request.query);
        const data = await analytics_service_1.analyticsService.listDetailedBids(filters);
        return reply.status(200).send(data);
    },
    async listLocalMicroenterpriseParticipations(request, reply) {
        const filters = analytics_schema_1.listLocalMicroenterpriseParticipationsQuerySchema.parse(request.query);
        const data = await analytics_service_1.analyticsService.listLocalMicroenterpriseParticipations(filters);
        return reply.status(200).send(data);
    },
    async listGeneralMicroenterpriseParticipations(request, reply) {
        const filters = analytics_schema_1.listGeneralMicroenterpriseParticipationsQuerySchema.parse(request.query);
        const data = await analytics_service_1.analyticsService.listGeneralMicroenterpriseParticipations(filters);
        return reply.status(200).send(data);
    },
    async listExpensesByNature(request, reply) {
        const filters = analytics_schema_1.listExpensesByNatureQuerySchema.parse(request.query);
        const data = await analytics_service_1.analyticsService.listExpensesByNature(filters);
        return reply.status(200).send(data);
    },
    async getMicroenterpriseIndicator(request, reply) {
        const filters = analytics_schema_1.getMicroenterpriseIndicatorQuerySchema.parse(request.query);
        const data = await analytics_service_1.analyticsService.getMicroenterpriseIndicator(filters);
        return reply.status(200).send(data);
    },
    async listMicroenterpriseParticipationByNature(request, reply) {
        const filters = analytics_schema_1.listMicroenterpriseParticipationByNatureQuerySchema.parse(request.query);
        const data = await analytics_service_1.analyticsService.listMicroenterpriseParticipationByNature(filters);
        return reply.status(200).send(data);
    },
};
exports.analyticsController = analyticsController;
