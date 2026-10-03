import type { FastifyReply, FastifyRequest } from "fastify";

import { createUserSchema } from "./user.schema";
import { userService } from "./user.service";
import { AppError } from "../../utils/AppError";

const userController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createUserSchema.parse(request.body);

    const user = await userService.create(data);

    return reply.status(201).send(user);
  },

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