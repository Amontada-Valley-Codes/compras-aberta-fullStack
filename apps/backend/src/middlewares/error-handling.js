"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandling = errorHandling;
const zod_1 = require("zod");
const client_1 = require("../../prisma/generated/prisma/client");
const AppError_1 = require("../utils/AppError");
// Todas as respostas de erro seguem { message, issues? }, o mesmo formato
// documentado em docs/helpers.ts (errorResponse / validationErrorResponse).
function errorHandling(error, request, reply) {
    if (error instanceof AppError_1.AppError) {
        if (error.statusCode >= 500) {
            request.log.error({ err: error, details: error.details }, "Erro de aplicação (5xx)");
        }
        return reply.status(error.statusCode).send({ message: error.message });
    }
    if (error instanceof zod_1.ZodError) {
        return reply.status(400).send({
            message: "Validation error",
            issues: zod_1.z.flattenError(error),
        });
    }
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
        return reply.status(error.statusCode).send({ message: error.message });
    }
    // Violação de unicidade que escapou da checagem prévia no service (ex.: dois
    // cadastros simultâneos com o mesmo e-mail).
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002") {
        return reply.status(409).send({ message: "Registro já existe" });
    }
    request.log.error({ err: error }, "Erro inesperado");
    return reply.status(500).send({ message: "Internal server error" });
}
