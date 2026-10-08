"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBusinessSchema = void 0;
const zod_1 = require("zod");
const validation_1 = require("../../utils/validation");
const cnpj_1 = require("../../utils/cnpj");
exports.registerBusinessSchema = zod_1.z.object({
    usuario: zod_1.z.string().trim().min(3).max(120).describe("Nome do usuário (3 a 120 caracteres)."),
    password: validation_1.password.describe("Senha de acesso (mínimo 6 caracteres)."),
    cnpj: cnpj_1.cnpj,
    nome_empresa: zod_1.z.string().trim().min(2).max(200).describe("Nome da empresa (2 a 200 caracteres)."),
    porte_empresa: zod_1.z.enum(["MEI", "ME", "EPP"]).describe("Porte da empresa."),
    email: validation_1.email,
});
