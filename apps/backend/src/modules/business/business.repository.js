"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessRepository = void 0;
const prisma_1 = require("../../lib/prisma");
exports.businessRepository = {
    async findByCnpj(cnpj) {
        return prisma_1.prisma.business.findUnique({
            where: { cnpj },
        });
    },
    async create(data) {
        return prisma_1.prisma.business.create({
            data,
        });
    },
};
