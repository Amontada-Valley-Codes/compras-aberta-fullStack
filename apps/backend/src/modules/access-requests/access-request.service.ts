import { hash } from "bcryptjs";

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

function toResponse(request: AccessRequestDetails) {
  return {
    id: request.id,
    status: request.status,
    companyName: request.companyName,
    cnpj: request.cnpj,
    phone: request.phone,
    message: request.message,
    municipio: {
      codigoIbge: request.municipio.codigo_ibge,
      nome: request.municipio.nome,
    },
    requester: request.user,
    reviewNote: request.reviewNote,
    reviewedAt: request.reviewedAt,
    reviewedBy: request.reviewedBy?.name ?? null,
    createdAt: request.createdAt,
  };
}

async function review(
  id: string,
  status: Exclude<AccessRequestStatus, "PENDING">,
  reviewedById: string,
  reviewNote?: string,
) {
  const request = await accessRequestRepository.findById(id);

  if (!request) {
    throw new AppError("Solicitação não encontrada", 404);
  }

  const reviewed = await accessRequestRepository.review({
    id,
    status,
    reviewedById,
    reviewNote,
  });

  if (!reviewed) {
    throw new AppError("Esta solicitação já foi analisada", 409);
  }

  const updated = await accessRequestRepository.findById(id);

  return toResponse(updated!);
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
    const requests = await accessRequestRepository.list(status);

    return requests.map(toResponse);
  },

  async approve(id: string, reviewerId: string, note?: string) {
    return review(id, "APPROVED", reviewerId, note);
  },

  async reject(id: string, reviewerId: string, note: string) {
    return review(id, "REJECTED", reviewerId, note);
  },
};

export { accessRequestService };
