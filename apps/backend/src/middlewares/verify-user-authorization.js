"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyUserAuthorization = verifyUserAuthorization;
const AppError_1 = require("../utils/AppError");
function verifyUserAuthorization(roles) {
    return async function (request, _reply) {
        if (!request.user || !roles.includes(request.user.role)) {
            throw new AppError_1.AppError("Unauthorized", 403);
        }
    };
}
