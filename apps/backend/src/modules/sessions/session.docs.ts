import {
  errorResponse,
  field,
  object,
  toJsonSchema,
  tooManyRequestsResponse,
  validationErrorResponse,
} from "../../docs/helpers";
import { createSessionSchema } from "./session.schema";

const createSessionDocs = {
  tags: ["Autenticação"],
  summary: "Fazer login",
  description: [
    "Autentica o usuário com e-mail e senha e devolve um **token JWT** (HS256, validade de 1 dia).",
    "",
    "Use o token nas rotas protegidas: `Authorization: Bearer <token>`.",
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

export { createSessionDocs };
