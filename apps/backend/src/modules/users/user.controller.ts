import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { userService } from "./user.service";
import { AppError } from "../../utils/AppError";

const createAdminSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido")),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const userController = {
  async me(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      throw new AppError("Usuário não autenticado.", 401);
    }
    const userId = request.user.id;
    const profile = await userService.getProfile(userId);

    return reply.status(200).send(profile);
  },

  async listAdmins(request: FastifyRequest, reply: FastifyReply) {
    const admins = await userService.listAdmins();
    return reply.status(200).send(admins);
  },

  async createAdmin(request: FastifyRequest, reply: FastifyReply) {
    const data = createAdminSchema.parse(request.body);
    const admin = await userService.createAdmin(data);
    return reply.status(201).send(admin);
  },

  async deleteAdmin(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const currentAdminId = request.user!.id;
    const result = await userService.deleteAdmin(id, currentAdminId);
    return reply.status(200).send(result);
  },
};

export { userController };