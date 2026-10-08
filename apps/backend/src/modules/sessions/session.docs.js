"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshSessionDocs = exports.logoutSessionDocs = exports.createSessionDocs = void 0;
const helpers_1 = require("../../docs/helpers");
const session_schema_1 = require("./session.schema");
const createSessionDocs = {
    tags: ["Autenticação"],
    summary: "Fazer login",
    description: [
        "Autentica o usuário com e-mail e senha e devolve um **token JWT** (HS256, validade de 15 minutos) e um **refresh token** (validade de 7 dias).",
        "",
        "Use o token nas rotas protegidas: `Authorization: Bearer <token>`. Quando ele expirar, troque o refresh token em `POST /sessions/refresh`.",
        "",
        "- O e-mail é normalizado (sem espaços, minúsculo) antes da busca.",
        "- Para não revelar quais e-mails existem, e-mail inexistente e senha errada retornam a **mesma** mensagem (401).",
        "- Usuários desativados recebem 403, mas só depois de informarem a senha correta.",
        "- Empresas com solicitação **pendente ou recusada** também fazem login (para acompanhar a solicitação); o `accessStatus` no token indica a situação.",
        "",
        "**Limite:** 5 requisições por minuto por IP.",
    ].join("\n"),
    body: (0, helpers_1.toJsonSchema)(session_schema_1.createSessionSchema),
    response: {
        200: (0, helpers_1.object)("Login realizado com sucesso.", {
            token: helpers_1.field.string("Token JWT. O `sub` é o id do usuário, o `role` é ADMIN ou BUSINESS e o `accessStatus` é a situação da solicitação de acesso.", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiQlVTSU5FU1MiLCJzdWIiOiIuLi4ifQ.assinatura"),
            refreshToken: helpers_1.field.string("Token opaco para obter um novo par de tokens. Guarde com segurança.", "k3Jf9Zq1x0m5V2yQ7pLw8sTn4uHc6bAeR1dGoIzXvYtMjNkPqWfSaUlCrBhEgDiO"),
        }),
        400: helpers_1.validationErrorResponse,
        401: (0, helpers_1.errorResponse)("E-mail ou senha incorretos.", "E-mail ou senha inválidos"),
        403: (0, helpers_1.errorResponse)("Credenciais corretas, mas a conta está desativada.", "Usuário desativado"),
        429: helpers_1.tooManyRequestsResponse,
    },
};
exports.createSessionDocs = createSessionDocs;
const refreshSessionDocs = {
    tags: ["Autenticação"],
    summary: "Renovar a sessão",
    description: [
        "Troca um refresh token válido por um **novo par** de token JWT e refresh token.",
        "",
        "- O refresh token é de **uso único**: o enviado aqui é revogado e o novo deve substituí-lo.",
        "- Reapresentar um refresh token já usado ou revogado é tratado como possível vazamento e **revoga todas as sessões** do usuário.",
        "- Se o usuário foi desativado, a renovação é negada (403) e as sessões são revogadas.",
        "",
        "**Limite:** 20 requisições por minuto por IP.",
    ].join("\n"),
    body: (0, helpers_1.toJsonSchema)(session_schema_1.refreshSessionSchema),
    response: {
        200: (0, helpers_1.object)("Sessão renovada.", {
            token: helpers_1.field.string("Novo token JWT (15 minutos)."),
            refreshToken: helpers_1.field.string("Novo refresh token (7 dias)."),
        }),
        400: helpers_1.validationErrorResponse,
        401: (0, helpers_1.errorResponse)("Refresh token inexistente, revogado ou expirado.", "Refresh token inválido"),
        403: (0, helpers_1.errorResponse)("A conta está desativada.", "Usuário desativado"),
        429: helpers_1.tooManyRequestsResponse,
    },
};
exports.refreshSessionDocs = refreshSessionDocs;
const logoutSessionDocs = {
    tags: ["Autenticação"],
    summary: "Encerrar a sessão",
    description: [
        "Revoga o refresh token informado. É idempotente: um token desconhecido ou já revogado também responde 204.",
        "",
        "O token JWT já emitido continua válido até expirar (no máximo 15 minutos).",
        "",
        "**Limite:** 20 requisições por minuto por IP.",
    ].join("\n"),
    body: (0, helpers_1.toJsonSchema)(session_schema_1.refreshSessionSchema),
    response: {
        204: { description: "Sessão encerrada." },
        400: helpers_1.validationErrorResponse,
        429: helpers_1.tooManyRequestsResponse,
    },
};
exports.logoutSessionDocs = logoutSessionDocs;
