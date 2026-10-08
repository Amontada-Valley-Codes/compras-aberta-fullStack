"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationErrorResponse = exports.tooManyRequestsResponse = exports.field = exports.badGatewayResponse = void 0;
exports.errorResponse = errorResponse;
exports.object = object;
exports.toJsonSchema = toJsonSchema;
const zod_1 = require("zod");
function stripDatePatterns(node) {
    if (Array.isArray(node)) {
        return node.map(stripDatePatterns);
    }
    if (node && typeof node === "object") {
        const entries = Object.entries(node);
        const isDate = entries.some(([k, v]) => k === "format" && v === "date");
        return Object.fromEntries(entries
            .filter(([key]) => !(isDate && key === "pattern"))
            .map(([key, value]) => [key, stripDatePatterns(value)]));
    }
    return node;
}
function toJsonSchema(schema) {
    const { $schema: _ignored, ...json } = zod_1.z.toJSONSchema(schema, {
        io: "input",
        target: "openapi-3.0",
    });
    return stripDatePatterns(json);
}
const field = {
    string: (description, example) => ({
        type: "string",
        description,
        ...(example !== undefined && { example }),
    }),
    nullableString: (description, example) => ({
        type: "string",
        nullable: true,
        description,
        ...(example !== undefined && { example }),
    }),
    integer: (description, example) => ({
        type: "integer",
        description,
        ...(example !== undefined && { example }),
    }),
    nullableNumber: (description, example) => ({
        type: "number",
        nullable: true,
        description,
        ...(example !== undefined && { example }),
    }),
    money: (description, example = "1250000.50") => ({
        type: "string",
        description: `${description} Valor monetário (R$) em string decimal, para não perder precisão.`,
        example,
    }),
};
exports.field = field;
function object(description, properties) {
    return {
        type: "object",
        description,
        properties,
        required: Object.keys(properties),
    };
}
function errorResponse(description, exampleMessage) {
    return {
        description,
        type: "object",
        properties: {
            message: { type: "string", example: exampleMessage },
        },
        required: ["message"],
    };
}
const validationErrorResponse = {
    description: "Parâmetros inválidos. `issues.fieldErrors` traz, por campo, a lista de problemas encontrados.",
    type: "object",
    properties: {
        message: { type: "string", example: "Validation error" },
        issues: {
            type: "object",
            properties: {
                formErrors: { type: "array", items: { type: "string" } },
                fieldErrors: {
                    type: "object",
                    additionalProperties: { type: "array", items: { type: "string" } },
                    example: { email: ["E-mail inválido"] },
                },
            },
        },
    },
    required: ["message"],
};
exports.validationErrorResponse = validationErrorResponse;
const tooManyRequestsResponse = errorResponse("Limite de requisições excedido para esta rota. Aguarde o tempo indicado na mensagem.", "Muitas requisições. Tente novamente em 1 minute.");
exports.tooManyRequestsResponse = tooManyRequestsResponse;
const badGatewayResponse = errorResponse("A API externa de dados falhou ou está indisponível (mesmo após novas tentativas automáticas).", "Não foi possível conectar à API de análise de dados.");
exports.badGatewayResponse = badGatewayResponse;
