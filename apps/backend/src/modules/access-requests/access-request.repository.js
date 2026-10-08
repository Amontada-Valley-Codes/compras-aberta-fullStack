"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accessRequestRepository = void 0;
const prisma_1 = require("../../lib/prisma");
const accessRequestDetails = {
    id: true,
    status: true,
    companyName: true,
    cnpj: true,
    phone: true,
    message: true,
    reviewNote: true,
    reviewedAt: true,
    createdAt: true,
    municipio: { select: { codigo_ibge: true, nome: true } },
    user: { select: { name: true, email: true } },
    reviewedBy: { select: { name: true } },
};
const accessRequestRepository = {
    // Usuário e solicitação nascem juntos: não pode existir um BUSINESS novo
    // sem solicitação (ele ficaria sem como ser aprovado).
    async create({ user, municipioIbge, ...data }) {
        return prisma_1.prisma.accessRequest.create({
            data: {
                ...data,
                municipio: { connect: { codigo_ibge: municipioIbge } },
                user: { create: { ...user, role: "BUSINESS" } },
            },
            select: { id: true, status: true, createdAt: true },
        });
    },
    async findOpenByCnpj(cnpj) {
        return prisma_1.prisma.accessRequest.findFirst({
            where: { cnpj, status: { in: ["PENDING", "APPROVED"] } },
            select: { id: true },
        });
    },
    async municipioExists(codigoIbge) {
        const municipio = await prisma_1.prisma.municipios.findUnique({
            where: { codigo_ibge: codigoIbge },
            select: { id: true },
        });
        return municipio !== null;
    },
    async findById(id) {
        return prisma_1.prisma.accessRequest.findUnique({
            where: { id },
            select: accessRequestDetails,
        });
    },
    async findByUserId(userId) {
        return prisma_1.prisma.accessRequest.findUnique({
            where: { userId },
            select: accessRequestDetails,
        });
    },
    async list(status) {
        return prisma_1.prisma.accessRequest.findMany({
            where: status ? { status } : undefined,
            select: accessRequestDetails,
            orderBy: { createdAt: "desc" },
        });
    },
    // Só decide o que ainda está PENDING; a condição no WHERE evita que dois
    // administradores decidam a mesma solicitação ao mesmo tempo.
    async review({ id, status, reviewedById, reviewNote }) {
        const { count } = await prisma_1.prisma.accessRequest.updateMany({
            where: { id, status: "PENDING" },
            data: { status, reviewedById, reviewNote, reviewedAt: new Date() },
        });
        return count > 0;
    },
};
exports.accessRequestRepository = accessRequestRepository;
