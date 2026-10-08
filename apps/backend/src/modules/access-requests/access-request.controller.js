"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accessRequestController = void 0;
const access_request_schema_1 = require("./access-request.schema");
const access_request_service_1 = require("./access-request.service");
const accessRequestController = {
    async create(request, reply) {
        const data = access_request_schema_1.createAccessRequestSchema.parse(request.body);
        const accessRequest = await access_request_service_1.accessRequestService.create(data);
        return reply.status(201).send(accessRequest);
    },
    // request.user é preenchido pelo ensureAuthenticated, que roda antes.
    async findMine(request, reply) {
        const accessRequest = await access_request_service_1.accessRequestService.findMine(request.user.id);
        return reply.status(200).send(accessRequest);
    },
    async list(request, reply) {
        const query = access_request_schema_1.listAccessRequestsSchema.parse(request.query);
        const accessRequests = await access_request_service_1.accessRequestService.list(query);
        return reply.status(200).send(accessRequests);
    },
    async approve(request, reply) {
        const { id } = access_request_schema_1.accessRequestParamsSchema.parse(request.params);
        const { note } = access_request_schema_1.approveAccessRequestSchema.parse(request.body ?? {});
        const accessRequest = await access_request_service_1.accessRequestService.approve(id, request.user.id, note);
        return reply.status(200).send(accessRequest);
    },
    async reject(request, reply) {
        const { id } = access_request_schema_1.accessRequestParamsSchema.parse(request.params);
        const { note } = access_request_schema_1.rejectAccessRequestSchema.parse(request.body);
        const accessRequest = await access_request_service_1.accessRequestService.reject(id, request.user.id, note);
        return reply.status(200).send(accessRequest);
    },
};
exports.accessRequestController = accessRequestController;
