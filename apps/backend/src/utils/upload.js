"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_FILE_SIZE = exports.ALLOWED_MIMETYPES = void 0;
exports.validateFile = validateFile;
const AppError_1 = require("./AppError");
exports.ALLOWED_MIMETYPES = ["application/pdf", "image/jpeg", "image/png"];
exports.MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
function validateFile(mimetype, size) {
    if (!exports.ALLOWED_MIMETYPES.includes(mimetype)) {
        throw new AppError_1.AppError(`Tipo de arquivo não permitido. Aceito apenas: ${exports.ALLOWED_MIMETYPES.join(", ")}`, 400);
    }
    if (size > exports.MAX_FILE_SIZE) {
        throw new AppError_1.AppError("O tamanho do arquivo não pode exceder 5MB", 400);
    }
}
