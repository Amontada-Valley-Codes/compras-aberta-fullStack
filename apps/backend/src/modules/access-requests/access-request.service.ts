import { hash } from "bcryptjs";

import { prisma } from "../../lib/prisma";
import { sendApprovalEmail } from "../../services/notification.service";
import { AppError } from "../../utils/AppError";
import { userRepository } from "../users/user.repository";
import { accessRequestRepository } from "./access-request.repository";
import type {
  AccessRequestStatus,
  CreateAccessRequestDTO,
  ListAccessRequestsDTO,
} from "./access-request.schema";

type AccessRequestDetails = NonNullable<
  Awaited<ReturnType<typeof accessRequestRepository.findById>>
>;

function buildDocsUrls(cnpj?: string | null) {
  if (!cnpj) return null;
  const clean = cnpj.replace(/\D/g, "");
  return {
    cartao_cnpj: `/api/admin/documents/${clean}/cartao_cnpj`,
    contrato_social: `/api/admin/documents/${clean}/contrato_social`,
    comprovante_endereco: `/api/admin/documents/${clean}/comprovante_endereco`,
    comprovante_socio: `/api/admin/documents/${clean}/comprovante_socio`,
  };
}

function toResponse(request: AccessRequestDetails) {
  const cnpj = request.cnpj || request.user?.cnpj || request.user?.business?.cnpj || null;
  return {
    id: request.id,
    status: request.status,
    companyName: request.companyName || request.user?.business?.name_businss || request.user?.name,
    cnpj: cnpj || "",
    phone: request.phone || "",
    message: request.message,
    municipio: {
      codigoIbge: request.municipio?.codigo_ibge ?? 0,
      nome: request.municipio?.nome ?? "Não informado",
    },
    requester: {
      name: request.user?.name ?? "",
      email: request.user?.email ?? "",
    },
    reviewNote: request.reviewNote,
    reviewedAt: request.reviewedAt ? new Date(request.reviewedAt).toISOString() : null,
    reviewedBy: request.reviewedBy?.name ?? null,
    createdAt: new Date(request.createdAt).toISOString(),
    docsUrls: buildDocsUrls(cnpj),
  };
}

async function review(
  id: string,
  status: Exclude<AccessRequestStatus, "PENDING">,
  reviewedById: string,
  reviewNote?: string,
) {
  const isActive = status === "APPROVED";

  // 1. Tenta achar na tabela accessRequest
  const request = await accessRequestRepository.findById(id);

  if (request) {
    const reviewed = await accessRequestRepository.review({
      id,
      status,
      reviewedById,
      reviewNote,
    });

    if (!reviewed) {
      throw new AppError("Esta solicitação já foi analisada", 409);
    }

    // Sincroniza ativação do usuário e empresa
    await prisma.$transaction([
      ...(request.user?.id
        ? [
            prisma.user.update({
              where: { id: request.user.id },
              data: { isActive },
            }),
          ]
        : []),
      ...(request.cnpj
        ? [
            prisma.business.updateMany({
              where: { cnpj: request.cnpj },
              data: { isActive },
            }),
          ]
        : []),
    ]);

    if (isActive && request.user?.email) {
      sendApprovalEmail({
        toEmail: request.user.email,
        companyName: request.companyName,
      });
    }

    const updated = await accessRequestRepository.findById(id);
    return toResponse(updated!);
  }

  // 2. Se não encontrou em accessRequest, busca por user.id
  const user = await prisma.user.findUnique({
    where: { id },
    include: { business: true },
  });

  if (!user || user.role !== "BUSINESS") {
    throw new AppError("Solicitação não encontrada", 404);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { isActive },
    }),
    ...(user.cnpj
      ? [
          prisma.business.updateMany({
            where: { cnpj: user.cnpj },
            data: { isActive },
          }),
        ]
      : []),
  ]);

  if (isActive && user.email) {
    sendApprovalEmail({
      toEmail: user.email,
      companyName: user.business?.name_businss || user.name,
    });
  }

  const reviewer = await prisma.user.findUnique({
    where: { id: reviewedById },
    select: { name: true },
  });

  const cnpj = user.cnpj || user.business?.cnpj || "";
  return {
    id: user.id,
    status: (isActive ? "APPROVED" : "REJECTED") as AccessRequestStatus,
    companyName: user.business?.name_businss || user.name,
    cnpj,
    phone: "",
    message: null,
    municipio: {
      codigoIbge: 0,
      nome: "Não informado",
    },
    requester: {
      name: user.name,
      email: user.email,
    },
    reviewNote: reviewNote || null,
    reviewedAt: new Date().toISOString(),
    reviewedBy: reviewer?.name ?? null,
    createdAt: new Date(user.createdAt).toISOString(),
    docsUrls: buildDocsUrls(cnpj),
  };
}

const accessRequestService = {
  // Espera dados já normalizados por createAccessRequestSchema (e-mail em
  // minúsculas, CNPJ e telefone só com dígitos).
  async create({
    name,
    email,
    password,
    phone,
    companyName,
    cnpj,
    municipioIbge,
    message,
  }: CreateAccessRequestDTO) {
    const userAlreadyExists = await userRepository.findByEmail(email);

    if (userAlreadyExists) {
      throw new AppError("E-mail já cadastrado", 409);
    }

    const openRequest = await accessRequestRepository.findOpenByCnpj(cnpj);

    if (openRequest) {
      throw new AppError(
        "Já existe uma solicitação em análise ou aprovada para este CNPJ",
        409,
      );
    }

    const municipioExists =
      await accessRequestRepository.municipioExists(municipioIbge);

    if (!municipioExists) {
      throw new AppError("Município não encontrado", 400);
    }

    const passwordHash = await hash(password, 10);

    return accessRequestRepository.create({
      user: { name, email, password: passwordHash },
      companyName,
      cnpj,
      phone,
      municipioIbge,
      message,
    });
  },

  async findMine(userId: string) {
    const request = await accessRequestRepository.findByUserId(userId);

    if (!request) {
      throw new AppError("Solicitação não encontrada", 404);
    }

    return toResponse(request);
  },

  async list({ status }: ListAccessRequestsDTO) {
    const { accessRequests, businessUsers } =
      await accessRequestRepository.listAllRequests();

    const formattedAccessRequests = accessRequests.map(toResponse);

    const formattedBusinessUsers = businessUsers.map((u) => {
      const cnpj = u.cnpj || u.business?.cnpj || "";
      const reqStatus: AccessRequestStatus = u.isActive ? "APPROVED" : "PENDING";
      return {
        id: u.id,
        status: reqStatus,
        companyName: u.business?.name_businss || u.name,
        cnpj,
        phone: "",
        message: null,
        municipio: {
          codigoIbge: 0,
          nome: "Não informado",
        },
        requester: {
          name: u.name,
          email: u.email,
        },
        reviewNote: null,
        reviewedAt: null,
        reviewedBy: null,
        createdAt: new Date(u.createdAt).toISOString(),
        docsUrls: buildDocsUrls(cnpj),
      };
    });

    const all = [...formattedAccessRequests, ...formattedBusinessUsers].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    if (status) {
      return all.filter((item) => item.status === status);
    }

    return all;
  },

  async approve(id: string, reviewerId: string, note?: string) {
    return review(id, "APPROVED", reviewerId, note);
  },

  async reject(id: string, reviewerId: string, note: string) {
    return review(id, "REJECTED", reviewerId, note);
  },
};

export { accessRequestService };
