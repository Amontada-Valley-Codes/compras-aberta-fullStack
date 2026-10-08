import {
  errorResponse,
  field,
  object,
  toJsonSchema,
  tooManyRequestsResponse,
  validationErrorResponse,
} from "../../docs/helpers";
import {
  accessRequestParamsSchema,
  approveAccessRequestSchema,
  createAccessRequestSchema,
  listAccessRequestsSchema,
  rejectAccessRequestSchema,
} from "./access-request.schema";

const tags = ["Solicitações de acesso"];
const security = [{ bearerAuth: [] }];

const status = {
  type: "string",
  enum: ["PENDING", "APPROVED", "REJECTED"],
  description:
    "Situação: `PENDING` (em análise), `APPROVED` (aprovada) ou `REJECTED` (recusada).",
  example: "PENDING",
};

const dateTime = (description: string, nullable = false) => ({
  type: "string",
  format: "date-time",
  ...(nullable && { nullable: true }),
  description,
  example: "2026-10-07T12:00:00.000Z",
});

const accessRequest = object("Solicitação de acesso.", {
  id: field.string("Id da solicitação.", "6f1c2d3e-4b5a-4c6d-8e9f-0a1b2c3d4e5f"),
  status,
  companyName: field.string("Razão social.", "Mercado São José Ltda."),
  cnpj: field.string("CNPJ só com dígitos.", "11222333000181"),
  phone: field.string("Telefone só com dígitos.", "88999990000"),
  message: field.nullableString("Observação enviada pela empresa."),
  municipio: object("Município da empresa.", {
    codigoIbge: field.integer("Código IBGE.", 2300705),
    nome: field.nullableString("Nome do município.", "Amontada"),
  }),
  requester: object("Responsável que fez a solicitação.", {
    name: field.string("Nome.", "Ana Ribeiro"),
    email: field.string("E-mail de acesso.", "ana@mercadosaojose.com.br"),
  }),
  reviewNote: field.nullableString(
    "Observação da decisão (na recusa, é o motivo).",
  ),
  reviewedAt: dateTime("Data e hora da decisão (UTC).", true),
  reviewedBy: field.nullableString("Nome do administrador que decidiu."),
  createdAt: dateTime("Data e hora do envio (UTC)."),
});

const unauthorized = errorResponse("Token ausente ou inválido.", "Invalid JWT token");
const forbidden = errorResponse("O usuário não é administrador.", "Unauthorized");
const notFound = errorResponse("Solicitação inexistente.", "Solicitação não encontrada");
const alreadyReviewed = errorResponse(
  "A solicitação já foi aprovada ou recusada.",
  "Esta solicitação já foi analisada",
);

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
  body: toJsonSchema(createAccessRequestSchema),
  response: {
    201: object("Solicitação registrada.", {
      id: field.string("Id da solicitação."),
      status,
      createdAt: dateTime("Data e hora do envio (UTC)."),
    }),
    400: validationErrorResponse,
    409: errorResponse(
      "E-mail já cadastrado ou CNPJ com solicitação em aberto.",
      "E-mail já cadastrado",
    ),
    429: tooManyRequestsResponse,
  },
};

const findMyAccessRequestDocs = {
  tags,
  summary: "Consultar minha solicitação",
  description:
    "Devolve a solicitação de acesso do usuário logado, para ele acompanhar a situação. Funciona com qualquer situação (inclusive pendente ou recusada).",
  security,
  response: {
    200: accessRequest,
    401: unauthorized,
    404: notFound,
  },
};

const listAccessRequestsDocs = {
  tags,
  summary: "Listar solicitações",
  description:
    "Lista as solicitações de acesso, das mais recentes para as mais antigas. **Somente `ADMIN`.**",
  security,
  querystring: toJsonSchema(listAccessRequestsSchema),
  response: {
    200: { type: "array", description: "Solicitações.", items: accessRequest },
    400: validationErrorResponse,
    401: unauthorized,
    403: forbidden,
  },
};

const approveAccessRequestDocs = {
  tags,
  summary: "Aprovar solicitação",
  description: [
    "Aprova uma solicitação **`PENDING`** e libera a área da empresa para o responsável. **Somente `ADMIN`.**",
    "",
    "A liberação vale no próximo login ou renovação de sessão do usuário (o token atual dura no máximo 15 minutos).",
  ].join("\n"),
  security,
  params: toJsonSchema(accessRequestParamsSchema),
  body: toJsonSchema(approveAccessRequestSchema),
  response: {
    200: accessRequest,
    400: validationErrorResponse,
    401: unauthorized,
    403: forbidden,
    404: notFound,
    409: alreadyReviewed,
  },
};

const rejectAccessRequestDocs = {
  tags,
  summary: "Recusar solicitação",
  description:
    "Recusa uma solicitação **`PENDING`**. O motivo (`note`) é obrigatório e fica visível para a empresa. **Somente `ADMIN`.**",
  security,
  params: toJsonSchema(accessRequestParamsSchema),
  body: toJsonSchema(rejectAccessRequestSchema),
  response: {
    200: accessRequest,
    400: validationErrorResponse,
    401: unauthorized,
    403: forbidden,
    404: notFound,
    409: alreadyReviewed,
  },
};

export {
  approveAccessRequestDocs,
  createAccessRequestDocs,
  findMyAccessRequestDocs,
  listAccessRequestsDocs,
  rejectAccessRequestDocs,
};
