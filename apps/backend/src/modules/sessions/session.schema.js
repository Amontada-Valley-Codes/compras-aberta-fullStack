"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshSessionSchema = exports.createSessionSchema = void 0;
const zod_1 = require("zod");
const validation_1 = require("../../utils/validation");
const createSessionSchema = zod_1.z.object({
    email: validation_1.email.describe("E-mail cadastrado do usuário."),
    // Sem regra de tamanho mínimo no login: a regra vale para o cadastro, e
    // exigir aqui só revelaria a política de senha a quem está tentando adivinhar.
    password: zod_1.z
        .string()
        .min(1, "Senha é obrigatória")
        .max(200, "Senha inválida")
        .describe("Senha do usuário."),
});
exports.createSessionSchema = createSessionSchema;
const refreshSessionSchema = zod_1.z.object({
    refreshToken: zod_1.z
        .string()
        .min(1, "Refresh token é obrigatório")
        .max(200, "Refresh token inválido")
        .describe("Refresh token recebido no login ou no último refresh."),
});
exports.refreshSessionSchema = refreshSessionSchema;
