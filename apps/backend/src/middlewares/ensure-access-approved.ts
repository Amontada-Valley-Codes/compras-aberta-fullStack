import type { FastifyReply, FastifyRequest } from "fastify";

import { AppError } from "../utils/AppError";

// Usar depois do ensureAuthenticated, nas rotas da área da empresa: só deixa
// passar quem teve a solicitação de acesso aprovada (ADMIN sempre passa).
async function ensureAccessApproved(
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  const accessStatus = request.user?.accessStatus;

  if (accessStatus === "PENDING") {
    throw new AppError("Sua solicitação de acesso ainda está em análise", 403);
  }

  if (accessStatus !== "APPROVED") {
    throw new AppError("Sua solicitação de acesso foi recusada", 403);
  }
}

export { ensureAccessApproved };
