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
    try {
      const fallback = { ...query, include: undefined } as T;
      return await prisma.user.findUnique(fallback as any);
    } catch {
      throw error;
    }
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
    try {
      return await prisma.user.findUnique({
        where: { id },
        include: { ...withAccessStatus, business: true },
      });
    } catch (error) {
      try {
        return await prisma.user.findUnique({
          where: { id },
          include: { business: true },
        });
      } catch {
        throw error;
      }
    }
  },

  async listAdmins() {
    return prisma.user.findMany({
      where: { role: "ADMIN" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
  },

  async createAdmin(data: { name: string; email: string; password: string }) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        role: "ADMIN",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  },

  async createManager(data: { name: string; email: string; password: string }) {
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return prisma.user.create({
      data: {
        ...data,
        role: "MANAGER",
        isActive: true,
        subscriptionStatus: "trialing",
        trialEndsAt,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        municipioIbge: true,
        createdAt: true,
        subscriptionStatus: true,
        trialEndsAt: true,
      },
    });
  },

  async countAdmins() {
    return prisma.user.count({
      where: { role: "ADMIN", isActive: true },
    });
  },

  async deleteAdmin(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  },
};

export { userRepository };