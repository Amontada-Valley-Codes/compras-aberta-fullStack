"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMunicipiosQuerySchema = void 0;
const zod_1 = require("zod");
const listMunicipiosQuerySchema = zod_1.z.object({
    search: zod_1.z
        .string()
        .trim()
        .min(1)
        .max(100)
        .optional()
        .describe("Filtro opcional. Se contiver só dígitos, busca pelo código IBGE exato; caso contrário, busca pelo nome (contém, sem diferenciar maiúsculas)."),
});
exports.listMunicipiosQuerySchema = listMunicipiosQuerySchema;
