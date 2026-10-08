"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectAccessRequestDocs = exports.listAccessRequestsDocs = exports.findMyAccessRequestDocs = exports.createAccessRequestDocs = exports.approveAccessRequestDocs = void 0;
const helpers_1 = require("../../docs/helpers");
const access_request_schema_1 = require("./access-request.schema");
const tags = ["Solicitações de acesso"];
const security = [{ bearerAuth: [] }];
const status = {
    type: "string",
    enum: ["PENDING", "APPROVED", "REJECTED"],
    description: "Situação: `PENDING` (em análise), `APPROVED` (aprovada) ou `REJECTED` (recusada).",
    example: "PENDING",
};
const dateTime = (description, nullable = false) => ({
    type: "string",
    format: "date-time",
    ...(nullable && { nullable: true }),
    description,
    example: "2026-10-07T12:00:00.000Z",
});
const accessRequest = (0, helpers_1.object)("Solicitação de acesso.", {
    id: helpers_1.field.string("Id da solicitação.", "6f1c2d3e-4b5a-4c6d-8e9f-0a1b2c3d4e5f"),
    status,
    companyName: helpers_1.field.string("Razão social.", "Mercado São José Ltda."),
    cnpj: helpers_1.field.string("CNPJ só com dígitos.", "11222333000181"),
    phone: helpers_1.field.string("Telefone só com dígitos.", "88999990000"),
    message: helpers_1.field.nullableString("Observação enviada pela empresa."),
    municipio: (0, helpers_1.object)("Município da empresa.", {
        codigoIbge: helpers_1.field.integer("Código IBGE.", 2300705),
        nome: helpers_1.field.nullableString("Nome do município.", "Amontada"),
    }),
    requester: (0, helpers_1.object)("Responsável que fez a solicitação.", {
        name: helpers_1.field.string("Nome.", "Ana Ribeiro"),
        email: helpers_1.field.string("E-mail de acesso.", "ana@mercadosaojose.com.br"),
    }),
    reviewNote: helpers_1.field.nullableString("Observação da decisão (na recusa, é o motivo)."),
    reviewedAt: dateTime("Data e hora da decisão (UTC).", true),
    reviewedBy: helpers_1.field.nullableString("Nome do administrador que decidiu."),
    createdAt: dateTime("Data e hora do envio (UTC)."),
});
const unauthorized = (0, helpers_1.errorResponse)("Token ausente ou inválido.", "Invalid JWT token");
const forbidden = (0, helpers_1.errorResponse)("O usuário não é administrador.", "Unauthorized");
const notFound = (0, helpers_1.errorResponse)("Solicitação inexistente.", "Solicitação não encontrada");
const alreadyReviewed = (0, helpers_1.errorResponse)("A solicitação já foi aprovada ou recusada.", "Esta solicitação já foi analisada");
const createAccessRequestDocs = {
    tags,
    summary: "Solicitar acesso",
    description: [
        "Cria a conta do responsável (papel **sempre `BUSINESS`**) e a solicitação de acesso da microempresa, com situação **`PENDING`**.",
        "",
        "- O login já funciona logo após o envio, mas a área da empresa só é liberada depois que um administrador **aprovar** a solicitação.",
        "- CNPJ e telefone aceitam máscara e são guardados só com dígitos. O CNPJ tem os dígitos verificadores validados.",
        "- Não é possível abrir uma nova solicitação para um CNPJ que já tenha outra em análise ou aprovada.",
        "",
        "**Limite:** 3 requisições a cada 10 minutos por IP.",
    ].join("\n"),
    body: (0, helpers_1.toJsonSchema)(access_request_schema_1.createAccessRequestSchema),
    response: {
        201: (0, helpers_1.object)("Solicitação registrada.", {
            id: helpers_1.field.string("Id da solicitação."),
            status,
            createdAt: dateTime("Data e hora do envio (UTC)."),
        }),
        400: helpers_1.validationErrorResponse,
        409: (0, helpers_1.errorResponse)("E-mail já cadastrado ou CNPJ com solicitação em aberto.", "E-mail já cadastrado"),
        429: helpers_1.tooManyRequestsResponse,
    },
};
exports.createAccessRequestDocs = createAccessRequestDocs;
const findMyAccessRequestDocs = {
    tags,
    summary: "Consultar minha solicitação",
    description: "Devolve a solicitação de acesso do usuário logado, para ele acompanhar a situação. Funciona com qualquer situação (inclusive pendente ou recusada).",
    security,
    response: {
        200: accessRequest,
        401: unauthorized,
        404: notFound,
    },
};
exports.findMyAccessRequestDocs = findMyAccessRequestDocs;
const listAccessRequestsDocs = {
    tags,
    summary: "Listar solicitações",
    description: "Lista as solicitações de acesso, das mais recentes para as mais antigas. **Somente `ADMIN`.**",
    security,
    querystring: (0, helpers_1.toJsonSchema)(access_request_schema_1.listAccessRequestsSchema),
    response: {
        200: { type: "array", description: "Solicitações.", items: accessRequest },
        400: helpers_1.validationErrorResponse,
        401: unauthorized,
        403: forbidden,
    },
};
exports.listAccessRequestsDocs = listAccessRequestsDocs;
const approveAccessRequestDocs = {
    tags,
    summary: "Aprovar solicitação",
    description: [
        "Aprova uma solicitação **`PENDING`** e libera a área da empresa para o responsável. **Somente `ADMIN`.**",
        "",
        "A liberação vale no próximo login ou renovação de sessão do usuário (o token atual dura no máximo 15 minutos).",
    ].join("\n"),
    security,
    params: (0, helpers_1.toJsonSchema)(access_request_schema_1.accessRequestParamsSchema),
    body: (0, helpers_1.toJsonSchema)(access_request_schema_1.approveAccessRequestSchema),
    response: {
        200: accessRequest,
        400: helpers_1.validationErrorResponse,
        401: unauthorized,
        403: forbidden,
        404: notFound,
        409: alreadyReviewed,
    },
};
exports.approveAccessRequestDocs = approveAccessRequestDocs;
const rejectAccessRequestDocs = {
    tags,
    summary: "Recusar solicitação",
    description: "Recusa uma solicitação **`PENDING`**. O motivo (`note`) é obrigatório e fica visível para a empresa. **Somente `ADMIN`.**",
    security,
    params: (0, helpers_1.toJsonSchema)(access_request_schema_1.accessRequestParamsSchema),
    body: (0, helpers_1.toJsonSchema)(access_request_schema_1.rejectAccessRequestSchema),
    response: {
        200: accessRequest,
        400: helpers_1.validationErrorResponse,
        401: unauthorized,
        403: forbidden,
        404: notFound,
        409: alreadyReviewed,
    },
};
exports.rejectAccessRequestDocs = rejectAccessRequestDocs;
