"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureAuthenticated = ensureAuthenticated;
const jsonwebtoken_1 = require("jsonwebtoken");
const auth_1 = require("../configs/auth");
const access_status_1 = require("../modules/access-requests/access-status");
const user_repository_1 = require("../modules/users/user.repository");
const AppError_1 = require("../utils/AppError");
async function ensureAuthenticated(request, _reply) {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
        throw new AppError_1.AppError("JWT token not found", 401);
    }
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
        throw new AppError_1.AppError("Invalid JWT token", 401);
    }
    let payload;
    try {
        const { role, sub } = (0, jsonwebtoken_1.verify)(token, auth_1.authConfig.jwt.secret, {
            algorithms: ["HS256"],
        });
        if (!sub || !role) {
            throw new Error("Invalid payload");
        }
        payload = { role, sub };
    }
    catch {
        throw new AppError_1.AppError("Invalid JWT token", 401);
    }
    // O JWT sozinho não reflete desativação, troca de papel nem a decisão da
    // solicitação de acesso; o banco é a fonte de verdade.
    const user = await user_repository_1.userRepository.findById(payload.sub);
    if (!user || !user.isActive) {
        throw new AppError_1.AppError("Invalid JWT token", 401);
    }
    request.user = {
        id: user.id,
        role: user.role,
        accessStatus: (0, access_status_1.resolveAccessStatus)(user),
    };
}
