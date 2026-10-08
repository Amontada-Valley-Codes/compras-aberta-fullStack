"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionService = void 0;
const bcryptjs_1 = require("bcryptjs");
const node_crypto_1 = require("node:crypto");
const jsonwebtoken_1 = require("jsonwebtoken");
const auth_1 = require("../../configs/auth");
const AppError_1 = require("../../utils/AppError");
const access_status_1 = require("../access-requests/access-status");
const user_repository_1 = require("../users/user.repository");
const refresh_token_repository_1 = require("./refresh-token.repository");
const DAY_IN_MS = 24 * 60 * 60 * 1000;
function hashToken(token) {
    return (0, node_crypto_1.createHash)("sha256").update(token).digest("hex");
}
async function issueTokens(user) {
    // accessStatus vai no token para o frontend decidir a rota sem consultar o
    // backend; quem garante a restrição de verdade é o ensureAccessApproved.
    const payload = { role: user.role, accessStatus: (0, access_status_1.resolveAccessStatus)(user) };
    const token = (0, jsonwebtoken_1.sign)(payload, auth_1.authConfig.jwt.secret, {
        subject: user.id,
        expiresIn: auth_1.authConfig.jwt.expiresIn,
        algorithm: "HS256",
    });
    const refreshToken = (0, node_crypto_1.randomBytes)(48).toString("base64url");
    await refresh_token_repository_1.refreshTokenRepository.create({
        tokenHash: hashToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + auth_1.authConfig.refreshToken.expiresInDays * DAY_IN_MS),
    });
    return { token, refreshToken };
}
const sessionService = {
    async create({ email, password }) {
        const user = await user_repository_1.userRepository.findByEmail(email);
        if (!user) {
            throw new AppError_1.AppError("E-mail ou senha inválidos", 401);
        }
        const passwordMatched = await (0, bcryptjs_1.compare)(password, user.password);
        if (!passwordMatched) {
            throw new AppError_1.AppError("E-mail ou senha inválidos", 401);
        }
        if (!user.isActive) {
            throw new AppError_1.AppError("Usuário desativado", 403);
        }
        return issueTokens(user);
    },
    async refresh(refreshToken) {
        const stored = await refresh_token_repository_1.refreshTokenRepository.findByHash(hashToken(refreshToken));
        if (!stored) {
            throw new AppError_1.AppError("Refresh token inválido", 401);
        }
        if (stored.revokedAt) {
            await refresh_token_repository_1.refreshTokenRepository.revokeAllByUser(stored.userId);
            throw new AppError_1.AppError("Refresh token inválido", 401);
        }
        if (stored.expiresAt <= new Date()) {
            throw new AppError_1.AppError("Refresh token expirado", 401);
        }
        const user = await user_repository_1.userRepository.findById(stored.userId);
        if (!user || !user.isActive) {
            await refresh_token_repository_1.refreshTokenRepository.revokeAllByUser(stored.userId);
            throw new AppError_1.AppError("Usuário desativado", 403);
        }
        const rotated = await refresh_token_repository_1.refreshTokenRepository.revoke(stored.id);
        if (!rotated) {
            throw new AppError_1.AppError("Refresh token inválido", 401);
        }
        return issueTokens(user);
    },
    async logout(refreshToken) {
        const stored = await refresh_token_repository_1.refreshTokenRepository.findByHash(hashToken(refreshToken));
        if (stored) {
            await refresh_token_repository_1.refreshTokenRepository.revoke(stored.id);
        }
    },
};
exports.sessionService = sessionService;
