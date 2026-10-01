import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { z, ZodError } from "zod";

import { Prisma } from "../../prisma/generated/prisma/client";
import { AppError } from "../utils/AppError";

// Todas as respostas de erro seguem { message, issues? }, o mesmo formato
// documentado em docs/helpers.ts (errorResponse / validationErrorResponse).
function errorHandling(
  error: FastifyError | AppError | ZodError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      request.log.error(
        { err: error, details: error.details },
        "Erro de aplicação (5xx)",
      );
    }

    return reply.status(error.statusCode).send({ message: error.message });
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: "Validation error",
      issues: z.flattenError(error),
    });
  }

  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return reply.status(error.statusCode).send({ message: error.message });
  }

  // Violação de unicidade que escapou da checagem prévia no service (ex.: dois
  // cadastros simultâneos com o mesmo e-mail).
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return reply.status(409).send({ message: "Registro já existe" });
  }

  request.log.error({ err: error }, "Erro inesperado");

  return reply.status(500).send({ message: "Internal server error" });
}

export { errorHandling };
