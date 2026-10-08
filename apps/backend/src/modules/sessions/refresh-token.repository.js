"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTokenRepository = void 0;
const prisma_1 = require("../../lib/prisma");
const refreshTokenRepository = {
    async create(data) {
        return prisma_1.prisma.refreshToken.create({ data });
    },
    async findByHash(tokenHash) {
        return prisma_1.prisma.refreshToken.findUnique({ where: { tokenHash } });
    },
    async revoke(id) {
        const { count } = await prisma_1.prisma.refreshToken.updateMany({
            where: { id, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        return count === 1;
    },
    async revokeAllByUser(userId) {
        await prisma_1.prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    },
};
exports.refreshTokenRepository = refreshTokenRepository;
