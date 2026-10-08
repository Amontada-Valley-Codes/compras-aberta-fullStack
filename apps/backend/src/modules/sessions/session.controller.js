"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionController = void 0;
const session_schema_1 = require("./session.schema");
const session_service_1 = require("./session.service");
const sessionController = {
    async create(request, reply) {
        const data = session_schema_1.createSessionSchema.parse(request.body);
        const session = await session_service_1.sessionService.create(data);
        return reply.status(200).send(session);
    },
    async refresh(request, reply) {
        const { refreshToken } = session_schema_1.refreshSessionSchema.parse(request.body);
        const session = await session_service_1.sessionService.refresh(refreshToken);
        return reply.status(200).send(session);
    },
    async logout(request, reply) {
        const { refreshToken } = session_schema_1.refreshSessionSchema.parse(request.body);
        await session_service_1.sessionService.logout(refreshToken);
        return reply.status(204).send();
    },
};
exports.sessionController = sessionController;
