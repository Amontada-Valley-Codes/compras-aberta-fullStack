import { prisma } from "../../lib/prisma";

interface CreateRefreshTokenData {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
}

const refreshTokenRepository = {
  async create(data: CreateRefreshTokenData) {
    return prisma.refreshToken.create({ data });
  },

  async findByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  
  async revoke(id: string) {
    const { count } = await prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return count === 1;
  },

  async revokeAllByUser(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};

export { refreshTokenRepository };
