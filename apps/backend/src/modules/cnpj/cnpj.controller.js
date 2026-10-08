"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cnpjController = void 0;
const cnpj_schema_1 = require("./cnpj.schema");
const cnpj_service_1 = require("./cnpj.service");
const cnpjController = {
    async find(request, reply) {
        const params = cnpj_schema_1.findCnpjParamsSchema.parse(request.params);
        const company = await cnpj_service_1.cnpjService.find(params);
        return reply.status(200).send(company);
    },
};
exports.cnpjController = cnpjController;
