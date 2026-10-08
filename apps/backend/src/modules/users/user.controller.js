"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = void 0;
const user_service_1 = require("./user.service");
const AppError_1 = require("../../utils/AppError");
const userController = {
    async me(request, reply) {
        if (!request.user) {
            throw new AppError_1.AppError("Usuário não autenticado.", 401);
        }
        const userId = request.user.id;
        const profile = await user_service_1.userService.getProfile(userId);
        return reply.status(200).send(profile);
    },
};
exports.userController = userController;
