"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureAccessApproved = ensureAccessApproved;
const AppError_1 = require("../utils/AppError");
// Usar depois do ensureAuthenticated, nas rotas da área da empresa: só deixa
// passar quem teve a solicitação de acesso aprovada (ADMIN sempre passa).
async function ensureAccessApproved(request, _reply) {
    const accessStatus = request.user?.accessStatus;
    if (accessStatus === "PENDING") {
        throw new AppError_1.AppError("Sua solicitação de acesso ainda está em análise", 403);
    }
    if (accessStatus !== "APPROVED") {
        throw new AppError_1.AppError("Sua solicitação de acesso foi recusada", 403);
    }
}
