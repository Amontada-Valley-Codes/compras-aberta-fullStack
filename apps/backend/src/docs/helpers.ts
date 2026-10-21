import { z } from "zod";

type JsonSchema = Record<string, unknown>;

function stripDatePatterns(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(stripDatePatterns);
  }

  if (node && typeof node === "object") {
    const entries = Object.entries(node as JsonSchema);
    const isDate = entries.some(([k, v]) => k === "format" && v === "date");

    return Object.fromEntries(
      entries
        .filter(([key]) => !(isDate && key === "pattern"))
        .map(([key, value]) => [key, stripDatePatterns(value)]),
    );
  }

  return node;
}

function toJsonSchema(schema: z.ZodType): JsonSchema {
  const { $schema: _ignored, ...json } = z.toJSONSchema(schema, {
    io: "input",
    target: "openapi-3.0",
  }) as JsonSchema;

  return stripDatePatterns(json) as JsonSchema;
}

const field = {
  string: (description: string, example?: string): JsonSchema => ({
    type: "string",
    description,
    ...(example !== undefined && { example }),
  }),
  nullableString: (description: string, example?: string): JsonSchema => ({
    type: "string",
    nullable: true,
    description,
    ...(example !== undefined && { example }),
  }),
  integer: (description: string, example?: number): JsonSchema => ({
    type: "integer",
    description,
    ...(example !== undefined && { example }),
  }),
  nullableNumber: (description: string, example?: number): JsonSchema => ({
    type: "number",
    nullable: true,
    description,
    ...(example !== undefined && { example }),
  }),
  money: (description: string, example = "1250000.50"): JsonSchema => ({
    type: "string",
    description: `${description} Valor monetário (R$) em string decimal, para não perder precisão.`,
    example,
  }),
};

function object(
  description: string,
  properties: Record<string, JsonSchema>,
): JsonSchema {
  return {
    type: "object",
    description,
    properties,
    required: Object.keys(properties),
  };
}

function errorResponse(description: string, exampleMessage: string): JsonSchema {
  return {
    description,
    type: "object",
    properties: {
      message: { type: "string", example: exampleMessage },
    },
    required: ["message"],
  };
}

const validationErrorResponse: JsonSchema = {
  description:
    "Parâmetros inválidos. `issues.fieldErrors` traz, por campo, a lista de problemas encontrados.",
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

const tooManyRequestsResponse = errorResponse(
  "Limite de requisições excedido para esta rota. Aguarde o tempo indicado na mensagem.",
  "Muitas requisições. Tente novamente em 1 minute.",
);

const badGatewayResponse = errorResponse(
  "A API externa de dados falhou ou está indisponível (mesmo após novas tentativas automáticas).",
  "Não foi possível conectar à API de análise de dados.",
);

export {
  badGatewayResponse,
  errorResponse,
  field,
  object,
  toJsonSchema,
  tooManyRequestsResponse,
  validationErrorResponse,
};
