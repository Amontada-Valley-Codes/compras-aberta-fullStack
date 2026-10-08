"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = void 0;
const client_1 = require("../../../prisma/generated/prisma/client");
const prisma_1 = require("../../lib/prisma");
// O status da solicitação de acesso acompanha o usuário porque login,
// refresh e o middleware de autenticação precisam dele para liberar ou
// restringir a área da empresa.
const withAccessStatus = {
    accessRequest: { select: { status: true } },
};
async function findUserWithOptionalAccessStatus(query) {
    try {
        return await prisma_1.prisma.user.findUnique(query);
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === "P2021") {
            const fallback = { ...query, include: undefined };
            return await prisma_1.prisma.user.findUnique(fallback);
        }
        throw error;
    }
}
const userRepository = {
    async findByEmail(email) {
        return findUserWithOptionalAccessStatus({
            where: { email },
            include: withAccessStatus,
        });
    },
    async findById(id) {
        try {
            return await prisma_1.prisma.user.findUnique({
                where: { id },
                include: { ...withAccessStatus, business: true },
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === "P2021") {
                return prisma_1.prisma.user.findUnique({
                    where: { id },
                    include: { business: true },
                });
            }
            throw error;
        }
    },
};
exports.userRepository = userRepository;
