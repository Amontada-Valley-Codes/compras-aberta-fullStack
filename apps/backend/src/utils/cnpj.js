"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cnpj = void 0;
exports.sanitizeCnpj = sanitizeCnpj;
const zod_1 = require("zod");
function sanitizeCnpj(cnpj) {
    return cnpj.replace(/\D/g, "");
}
exports.cnpj = zod_1.z
    .string()
    .trim()
    .transform(sanitizeCnpj)
    .refine((val) => val.length === 14, {
    message: "CNPJ inválido",
})
    .describe("CNPJ da empresa (14 dígitos, com ou sem formatação).");
