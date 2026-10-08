"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectAccessRequestSchema = exports.listAccessRequestsSchema = exports.createAccessRequestSchema = exports.approveAccessRequestSchema = exports.accessRequestParamsSchema = void 0;
const zod_1 = require("zod");
const validation_1 = require("../../utils/validation");
const accessRequestStatus = zod_1.z.enum(["PENDING", "APPROVED", "REJECTED"]);
const createAccessRequestSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .trim()
        .min(3, "Nome deve ter pelo menos 3 caracteres")
        .max(120, "Nome deve ter no máximo 120 caracteres")
        .describe("Nome completo do responsável pela empresa (3 a 120 caracteres)."),
    email: validation_1.email.describe("E-mail de acesso do responsável. É normalizado (sem espaços, minúsculo) e deve ser único."),
    password: validation_1.password.describe("Senha de acesso (mínimo 6 caracteres)."),
    phone: validation_1.phone.describe("Telefone com DDD. Aceita com ou sem máscara; é guardado só com dígitos."),
    companyName: zod_1.z
        .string()
        .trim()
        .min(3, "Razão social deve ter pelo menos 3 caracteres")
        .max(160, "Razão social deve ter no máximo 160 caracteres")
        .describe("Razão social da microempresa."),
    cnpj: validation_1.cnpj.describe("CNPJ da empresa. Aceita com ou sem máscara; os dígitos verificadores são validados."),
    municipioIbge: zod_1.z.coerce
        .number({ error: "Selecione o município" })
        .int("Município inválido")
        .positive("Município inválido")
        .describe("Código IBGE do município da empresa (veja `GET /municipios`)."),
    message: zod_1.z
        .string()
        .trim()
        .max(500, "Mensagem deve ter no máximo 500 caracteres")
        .optional()
        .transform((value) => value || undefined)
        .describe("Observação opcional para a equipe de análise."),
});
exports.createAccessRequestSchema = createAccessRequestSchema;
const listAccessRequestsSchema = zod_1.z.object({
    status: accessRequestStatus
        .optional()
        .describe("Filtra pela situação. Sem o filtro, traz todas."),
});
exports.listAccessRequestsSchema = listAccessRequestsSchema;
const accessRequestParamsSchema = zod_1.z.object({
    id: zod_1.z.uuid("Identificador inválido").describe("Id da solicitação."),
});
exports.accessRequestParamsSchema = accessRequestParamsSchema;
const approveAccessRequestSchema = zod_1.z.object({
    note: zod_1.z
        .string()
        .trim()
        .max(500, "Observação deve ter no máximo 500 caracteres")
        .optional()
        .transform((value) => value || undefined)
        .describe("Observação opcional registrada junto com a aprovação."),
});
exports.approveAccessRequestSchema = approveAccessRequestSchema;
// Na recusa a justificativa é obrigatória: é ela que a empresa vê na tela de
// status para entender o que precisa corrigir.
const rejectAccessRequestSchema = zod_1.z.object({
    note: zod_1.z
        .string()
        .trim()
        .min(5, "Informe o motivo da recusa (mínimo 5 caracteres)")
        .max(500, "Observação deve ter no máximo 500 caracteres")
        .describe("Motivo da recusa. É exibido para a empresa."),
});
exports.rejectAccessRequestSchema = rejectAccessRequestSchema;
