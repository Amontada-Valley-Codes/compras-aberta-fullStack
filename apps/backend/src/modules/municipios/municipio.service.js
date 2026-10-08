"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.municipioService = void 0;
const prisma_1 = require("../../lib/prisma");
const municipioService = {
    async list({ search }) {
        const codigoIbge = search && /^\d+$/.test(search) ? Number(search) : undefined;
        const municipios = await prisma_1.prisma.municipios.findMany({
            where: search
                ? codigoIbge !== undefined
                    ? { codigo_ibge: codigoIbge }
                    : { nome: { contains: search, mode: "insensitive" } }
                : undefined,
            select: {
                codigo_ibge: true,
                nome: true,
            },
            orderBy: { nome: "asc" },
        });
        return municipios.map(({ codigo_ibge, nome }) => ({
            id: codigo_ibge,
            nome,
        }));
    },
};
exports.municipioService = municipioService;
