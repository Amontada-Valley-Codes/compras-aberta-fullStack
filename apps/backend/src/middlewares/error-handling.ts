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
      message: "Erro de validação nos dados enviados.",
      issues: z.flattenError(error),
    });
  }

  // Captura erros de limite de tamanho de arquivo do Fastify e Multipart (413 Payload Too Large)
  const isFileTooLarge =
    (error as FastifyError).code === "FST_REQ_FILE_TOO_LARGE" ||
    (error as FastifyError).code === "FST_ERR_CTP_BODY_TOO_LARGE" ||
    error.statusCode === 413 ||
    (typeof error.message === "string" && error.message.toLowerCase().includes("file too large"));

  if (isFileTooLarge) {
    return reply.status(400).send({
      message: "O arquivo enviado excede o tamanho máximo permitido de 5 MB.",
    });
  }

  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return reply.status(error.statusCode).send({ message: error.message });
  }

  // Trata violações conhecidas do Prisma (unicidade, chaves estrangeiras, etc.)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = (error.meta?.target as string[])?.join(", ") || "registro";
      return reply.status(409).send({ message: `Já existe um cadastro com este ${target}.` });
    }
    if (error.code === "P2003") {
      return reply.status(400).send({
        message: "Falha na relação entre empresa e usuário. Verifique se o CNPJ fornecido está correto.",
      });
    }
    return reply.status(400).send({
      message: `Erro na operação do banco de dados (Código ${error.code}). Verifique os dados enviados.`,
    });
  }

  request.log.error({ err: error }, "Erro inesperado no servidor");

  const detailMessage = error?.message || "Ocorreu uma falha interna inesperada no servidor.";
  return reply.status(500).send({
    message: `Erro interno no servidor: ${detailMessage}`,
  });
}

export { errorHandling };
