import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import { AppError } from "../utils/AppError";

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
      issues: error.flatten(),
    });
  }

  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return reply.status(error.statusCode).send({ message: error.message });
  }

  request.log.error({ err: error }, "Erro inesperado");

  return reply.status(500).send({ message: "Internal server error" });
}

export { errorHandling };
