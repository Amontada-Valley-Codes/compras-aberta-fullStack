"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.municipioController = void 0;
const municipio_schema_1 = require("./municipio.schema");
const municipio_service_1 = require("./municipio.service");
const municipioController = {
    async list(request, reply) {
        const query = municipio_schema_1.listMunicipiosQuerySchema.parse(request.query);
        const municipios = await municipio_service_1.municipioService.list(query);
        return reply.status(200).send(municipios);
    },
};
exports.municipioController = municipioController;
