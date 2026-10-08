"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessController = void 0;
const business_schema_1 = require("./business.schema");
const business_service_1 = require("./business.service");
const AppError_1 = require("../../utils/AppError");
exports.businessController = {
    async register(request, reply) {
        const parts = request.parts();
        const fields = {};
        const files = {};
        try {
            for await (const part of parts) {
                if (part.type === "file") {
                    if (part.file?.truncated) {
                        throw new AppError_1.AppError(`O arquivo "${part.filename || 'enviado'}" excede o tamanho máximo permitido de 5 MB.`, 400);
                    }
                    const buffer = await part.toBuffer();
                    if (part.file?.truncated) {
                        throw new AppError_1.AppError(`O arquivo "${part.filename || 'enviado'}" excede o tamanho máximo permitido de 5 MB.`, 400);
                    }
                    files[part.fieldname] = {
                        filename: part.filename,
                        mimetype: part.mimetype,
                        data: buffer,
                    };
                }
                else if (part.type === "field") {
                    fields[part.fieldname] = part.value;
                }
            }
        }
        catch (err) {
            if (err instanceof AppError_1.AppError)
                throw err;
            if (err?.code === "FST_REQ_FILE_TOO_LARGE" ||
                err?.message?.toLowerCase()?.includes("file too large")) {
                throw new AppError_1.AppError("Um dos arquivos selecionados excede o tamanho máximo permitido de 5 MB.", 400);
            }
            throw err;
        }
        const requiredFiles = [
            "cartao_cnpj",
            "contrato_social",
            "comprovante_endereco",
            "comprovante_socio",
        ];
        const missingFiles = requiredFiles.filter((f) => !files[f]);
        if (missingFiles.length > 0) {
            throw new AppError_1.AppError(`Arquivos obrigatórios faltando: ${missingFiles.join(", ")}`, 400);
        }
        const data = business_schema_1.registerBusinessSchema.parse(fields);
        const result = await business_service_1.businessService.register(data, files);
        return reply.status(201).send(result);
    },
};
