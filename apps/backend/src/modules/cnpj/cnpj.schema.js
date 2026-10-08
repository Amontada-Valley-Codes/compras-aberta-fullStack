"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findCnpjParamsSchema = void 0;
const zod_1 = require("zod");
const validation_1 = require("../../utils/validation");
const findCnpjParamsSchema = zod_1.z.object({
    cnpj: validation_1.cnpj.describe("CNPJ a consultar. Aceita com ou sem máscara; os dígitos verificadores são validados."),
});
exports.findCnpjParamsSchema = findCnpjParamsSchema;
