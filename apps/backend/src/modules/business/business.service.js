"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessService = void 0;
const node_path_1 = __importDefault(require("node:path"));
const bcryptjs_1 = require("bcryptjs");
const prisma_1 = require("../../lib/prisma");
const supabase_1 = require("../../lib/supabase");
const AppError_1 = require("../../utils/AppError");
const upload_1 = require("../../utils/upload");
const user_repository_1 = require("../users/user.repository");
const business_repository_1 = require("./business.repository");
exports.businessService = {
    async register(data, files) {
        const userExists = await user_repository_1.userRepository.findByEmail(data.email);
        if (userExists) {
            throw new AppError_1.AppError("E-mail já cadastrado", 409);
        }
        const cnpjExists = await business_repository_1.businessRepository.findByCnpj(data.cnpj);
        if (cnpjExists) {
            throw new AppError_1.AppError("CNPJ já cadastrado", 409);
        }
        const fileList = [
            files.cartao_cnpj,
            files.contrato_social,
            files.comprovante_endereco,
            files.comprovante_socio,
        ];
        for (const file of fileList) {
            (0, upload_1.validateFile)(file.mimetype, file.data.length);
        }
        const BUCKET_NAME = "documentos-empresas";
        const cleanCnpj = data.cnpj.replace(/\D/g, "");
        const saveFile = async (file, prefix) => {
            const ext = node_path_1.default.extname(file.filename) || ".pdf";
            const fileName = `${cleanCnpj}/${prefix}${ext}`;
            const { data: uploadData, error } = await supabase_1.supabase.storage
                .from(BUCKET_NAME)
                .upload(fileName, file.data, {
                contentType: file.mimetype,
                upsert: true,
            });
            if (error) {
                console.error("Erro ao fazer upload para o Supabase:", error);
                throw new AppError_1.AppError("Ocorreu uma instabilidade ao processar seus documentos. Por favor, tente novamente em instantes.", 500);
            }
            return fileName; // Salva o caminho dentro do bucket
        };
        const cartaoCnpjPath = await saveFile(files.cartao_cnpj, "cartao_cnpj");
        const contratoSocialPath = await saveFile(files.contrato_social, "contrato_social");
        const comprovanteEnderecoPath = await saveFile(files.comprovante_endereco, "comprovante_endereco");
        const comprovanteSocioPath = await saveFile(files.comprovante_socio, "comprovante_socio");
        const hashedPassword = await (0, bcryptjs_1.hash)(data.password, 10);
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const business = await tx.business.create({
                data: {
                    cnpj: data.cnpj,
                    name_businss: data.nome_empresa,
                    porte_empresa: data.porte_empresa,
                    cartaoCnpjPath: cartaoCnpjPath,
                    cartaoCnpjMimeType: files.cartao_cnpj.mimetype,
                    contratoSocialPath: contratoSocialPath,
                    contratoSocialMimeType: files.contrato_social.mimetype,
                    comprovanteEnderecoPath: comprovanteEnderecoPath,
                    comprovanteEnderecoMimeType: files.comprovante_endereco.mimetype,
                    comprovanteSocioPath: comprovanteSocioPath,
                    comprovanteSocioMimeType: files.comprovante_socio.mimetype,
                },
            });
            const user = await tx.user.create({
                data: {
                    name: data.usuario,
                    email: data.email,
                    password: hashedPassword,
                    role: "BUSINESS",
                    cnpj: data.cnpj,
                    isActive: false, // Inicia inativo aguardando aprovação do Admin
                },
            });
            return { user, business };
        });
        return {
            status: "PENDING",
            message: "Solicitação cadastral enviada com sucesso! Seus dados e documentos estão sob análise do administrador.",
            user: {
                name: result.user.name,
                email: result.user.email,
                role: result.user.role,
                isActive: result.user.isActive,
                createdAt: result.user.createdAt,
            },
            business: {
                cnpj: result.business.cnpj,
                nome_empresa: result.business.name_businss,
                porte_empresa: result.business.porte_empresa,
            },
        };
    },
};
