import {
  errorResponse,
  field,
  object,
  toJsonSchema,
  tooManyRequestsResponse,
  validationErrorResponse,
} from "../../docs/helpers";
import { createSessionSchema, refreshSessionSchema } from "./session.schema";

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
    "",
    "**Limite:** 5 requisições por minuto por IP.",
  ].join("\n"),
  body: toJsonSchema(createSessionSchema),
  response: {
    200: object("Login realizado com sucesso.", {
      token: field.string(
        "Token JWT. O `sub` é o id do usuário e o `role` é ADMIN ou BUSINESS.",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiQlVTSU5FU1MiLCJzdWIiOiIuLi4ifQ.assinatura",
      ),
      refreshToken: field.string(
        "Token opaco para obter um novo par de tokens. Guarde com segurança.",
        "k3Jf9Zq1x0m5V2yQ7pLw8sTn4uHc6bAeR1dGoIzXvYtMjNkPqWfSaUlCrBhEgDiO",
      ),
    }),
    400: validationErrorResponse,
    401: errorResponse(
      "E-mail ou senha incorretos.",
      "E-mail ou senha inválidos",
    ),
    403: errorResponse(
      "Credenciais corretas, mas a conta está desativada.",
      "Usuário desativado",
    ),
    429: tooManyRequestsResponse,
  },
};

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
  body: toJsonSchema(refreshSessionSchema),
  response: {
    200: object("Sessão renovada.", {
      token: field.string("Novo token JWT (15 minutos)."),
      refreshToken: field.string("Novo refresh token (7 dias)."),
    }),
    400: validationErrorResponse,
    401: errorResponse(
      "Refresh token inexistente, revogado ou expirado.",
      "Refresh token inválido",
    ),
    403: errorResponse("A conta está desativada.", "Usuário desativado"),
    429: tooManyRequestsResponse,
  },
};

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
  body: toJsonSchema(refreshSessionSchema),
  response: {
    204: { description: "Sessão encerrada." },
    400: validationErrorResponse,
    429: tooManyRequestsResponse,
  },
};

export { createSessionDocs, logoutSessionDocs, refreshSessionDocs };
