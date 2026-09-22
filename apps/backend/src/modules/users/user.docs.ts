import {
  errorResponse,
  field,
  object,
  toJsonSchema,
  tooManyRequestsResponse,
  validationErrorResponse,
} from "../../docs/helpers";
import { createUserSchema } from "./user.schema";

const createUserDocs = {
  tags: ["Autenticação"],
  summary: "Cadastrar usuário",
  description: [
    "Cria uma conta de acesso. O papel é **sempre `BUSINESS`**: não é possível se cadastrar como administrador por esta rota.",
    "",
    "- O e-mail é normalizado (sem espaços, minúsculo) e precisa ser único.",
    "- A senha é armazenada com hash (bcrypt) e nunca é devolvida.",
    "- Depois do cadastro, faça login em `POST /sessions`.",
    "",
    "**Limite:** 3 requisições a cada 10 minutos por IP.",
  ].join("\n"),
  body: toJsonSchema(createUserSchema),
  response: {
    201: object("Usuário criado.", {
      name: field.string("Nome do usuário.", "Maria da Silva"),
      email: field.string(
        "E-mail já normalizado.",
        "maria@empresa.com.br",
      ),
      role: {
        type: "string",
        enum: ["BUSINESS", "ADMIN"],
        description: "Papel do usuário. Aqui será sempre `BUSINESS`.",
        example: "BUSINESS",
      },
      createdAt: {
        type: "string",
        format: "date-time",
        description: "Data e hora do cadastro (UTC).",
        example: "2026-09-21T20:33:00.000Z",
      },
    }),
    400: validationErrorResponse,
    409: errorResponse("Já existe um usuário com este e-mail.", "E-mail já cadastrado"),
    429: tooManyRequestsResponse,
  },
};

export { createUserDocs };
