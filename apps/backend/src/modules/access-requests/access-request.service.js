"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accessRequestService = void 0;
const bcryptjs_1 = require("bcryptjs");
const AppError_1 = require("../../utils/AppError");
const user_repository_1 = require("../users/user.repository");
const access_request_repository_1 = require("./access-request.repository");
function toResponse(request) {
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
async function review(id, status, reviewedById, reviewNote) {
    const request = await access_request_repository_1.accessRequestRepository.findById(id);
    if (!request) {
        throw new AppError_1.AppError("Solicitação não encontrada", 404);
    }
    const reviewed = await access_request_repository_1.accessRequestRepository.review({
        id,
        status,
        reviewedById,
        reviewNote,
    });
    if (!reviewed) {
        throw new AppError_1.AppError("Esta solicitação já foi analisada", 409);
    }
    const updated = await access_request_repository_1.accessRequestRepository.findById(id);
    return toResponse(updated);
}
const accessRequestService = {
    // Espera dados já normalizados por createAccessRequestSchema (e-mail em
    // minúsculas, CNPJ e telefone só com dígitos).
    async create({ name, email, password, phone, companyName, cnpj, municipioIbge, message, }) {
        const userAlreadyExists = await user_repository_1.userRepository.findByEmail(email);
        if (userAlreadyExists) {
            throw new AppError_1.AppError("E-mail já cadastrado", 409);
        }
        const openRequest = await access_request_repository_1.accessRequestRepository.findOpenByCnpj(cnpj);
        if (openRequest) {
            throw new AppError_1.AppError("Já existe uma solicitação em análise ou aprovada para este CNPJ", 409);
        }
        const municipioExists = await access_request_repository_1.accessRequestRepository.municipioExists(municipioIbge);
        if (!municipioExists) {
            throw new AppError_1.AppError("Município não encontrado", 400);
        }
        const passwordHash = await (0, bcryptjs_1.hash)(password, 10);
        return access_request_repository_1.accessRequestRepository.create({
            user: { name, email, password: passwordHash },
            companyName,
            cnpj,
            phone,
            municipioIbge,
            message,
        });
    },
    async findMine(userId) {
        const request = await access_request_repository_1.accessRequestRepository.findByUserId(userId);
        if (!request) {
            throw new AppError_1.AppError("Solicitação não encontrada", 404);
        }
        return toResponse(request);
    },
    async list({ status }) {
        const requests = await access_request_repository_1.accessRequestRepository.list(status);
        return requests.map(toResponse);
    },
    async approve(id, reviewerId, note) {
        return review(id, "APPROVED", reviewerId, note);
    },
    async reject(id, reviewerId, note) {
        return review(id, "REJECTED", reviewerId, note);
    },
};
exports.accessRequestService = accessRequestService;
