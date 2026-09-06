import type { FastifyReply, FastifyRequest } from "fastify";

import { createUserSchema } from "./user.schema";
import { userService } from "./user.service";

const userController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createUserSchema.parse(request.body);

    const user = await userService.create(data);

    return reply.status(201).send(user);
  },
};


export { userController };