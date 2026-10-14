import { prisma } from "../../lib/prisma";
import type { AccessRequestStatus } from "./access-request.schema";

interface CreateAccessRequestData {
  user: {
    name: string;
    email: string;
    password: string;
  };
  companyName: string;
  cnpj: string;
  phone: string;
  municipioIbge: number;
  message?: string;
}

interface ReviewAccessRequestData {
  id: string;
  status: Exclude<AccessRequestStatus, "PENDING">;
  reviewedById: string;
  reviewNote?: string;
}

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
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      cnpj: true,
      isActive: true,
      business: true,
    },
  },
  reviewedBy: { select: { name: true } },
} as const;

const accessRequestRepository = {
  // Usuário e solicitação nascem juntos: não pode existir um BUSINESS novo
  // sem solicitação (ele ficaria sem como ser aprovado).
  async create({ user, municipioIbge, ...data }: CreateAccessRequestData) {
    return prisma.accessRequest.create({
      data: {
        ...data,
        municipio: { connect: { codigo_ibge: municipioIbge } },
        user: { create: { ...user, role: "BUSINESS" } },
      },
      select: { id: true, status: true, createdAt: true },
    });
  },

  async findOpenByCnpj(cnpj: string) {
    return prisma.accessRequest.findFirst({
      where: { cnpj, status: { in: ["PENDING", "APPROVED"] } },
      select: { id: true },
    });
  },

  async municipioExists(codigoIbge: number) {
    const municipio = await prisma.municipios.findUnique({
      where: { codigo_ibge: codigoIbge },
      select: { id: true },
    });

    return municipio !== null;
  },

  async findById(id: string) {
    return prisma.accessRequest.findUnique({
      where: { id },
      select: accessRequestDetails,
    });
  },

  async findByUserId(userId: string) {
    return prisma.accessRequest.findUnique({
      where: { userId },
      select: accessRequestDetails,
    });
  },

  async list(status?: AccessRequestStatus) {
    return prisma.accessRequest.findMany({
      where: status ? { status } : undefined,
      select: accessRequestDetails,
      orderBy: { createdAt: "desc" },
    });
  },

  async listAllRequests() {
    const accessRequests = await prisma.accessRequest.findMany({
      select: accessRequestDetails,
      orderBy: { createdAt: "desc" },
    });

    const handledUserIds = accessRequests
      .map((r) => r.user?.id)
      .filter((id): id is string => Boolean(id));

    const businessUsers = await prisma.user.findMany({
      where: {
        role: "BUSINESS",
        id: handledUserIds.length > 0 ? { notIn: handledUserIds } : undefined,
      },
      include: {
        business: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { accessRequests, businessUsers };
  },

  // Só decide o que ainda está PENDING; a condição no WHERE evita que dois
  // administradores decidam a mesma solicitação ao mesmo tempo.
  async review({ id, status, reviewedById, reviewNote }: ReviewAccessRequestData) {
    const { count } = await prisma.accessRequest.updateMany({
      where: { id, status: "PENDING" },
      data: { status, reviewedById, reviewNote, reviewedAt: new Date() },
    });

    return count > 0;
  },
};

export { accessRequestRepository };
