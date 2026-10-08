import { Prisma } from "../../../prisma/generated/prisma/client";
import { prisma } from "../../lib/prisma";

// O status da solicitação de acesso acompanha o usuário porque login,
// refresh e o middleware de autenticação precisam dele para liberar ou
// restringir a área da empresa.
const withAccessStatus = {
  accessRequest: { select: { status: true } },
} as const;

async function findUserWithOptionalAccessStatus<T extends { where: { email?: string; id?: string } }>(
  query: T,
) {
  try {
    return await prisma.user.findUnique(query as any);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      const fallback = { ...query, include: undefined } as T;
      return await prisma.user.findUnique(fallback as any);
    }

    throw error;
  }
}

const userRepository = {
  async findByEmail(email: string) {
    return findUserWithOptionalAccessStatus({
      where: { email },
      include: withAccessStatus,
    });
  },

  async findById(id: string) {
    return findUserWithOptionalAccessStatus({
      where: { id },
      include: withAccessStatus,
    });
  },
};

export { userRepository };