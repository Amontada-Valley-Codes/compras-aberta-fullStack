import type { FastifyReply, FastifyRequest } from "fastify";

import { AppError } from "../utils/AppError";

function verifyUserAuthorization(roles: string[]) {
  return async function (
    request: FastifyRequest,
    _reply: FastifyReply,
  ) {
    if (!request.user || !roles.includes(request.user.role)) {
      throw new AppError("Unauthorized", 403);
    }
  };
}

export { verifyUserAuthorization };
