import type { FastifyReply, FastifyRequest } from "fastify";

import { userService } from "./user.service";
import { AppError } from "../../utils/AppError";

const userController = {
  async me(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      throw new AppError("Usuário não autenticado.", 401);
    }
    const userId = request.user.id;
    const profile = await userService.getProfile(userId);

    return reply.status(200).send(profile);
  },
};


export { userController };