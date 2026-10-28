import {
  errorResponse,
  field,
  object,
  toJsonSchema,
  tooManyRequestsResponse,
  validationErrorResponse,
} from "../../docs/helpers";
import { findCnpjParamsSchema } from "./cnpj.schema";

const findCnpjDocs = {
  tags: ["CNPJ"],
  summary: "Consultar CNPJ",
  description: [
    "Consulta os dados cadastrais de um CNPJ na base aberta da **Receita Federal** (via OpenCNPJ). É usada para preencher automaticamente a solicitação de acesso.",
    "",
    "- O resultado fica em **cache por 24 horas**.",
    "- `municipio.codigoIbge` só vem preenchido quando a empresa é do Ceará e o município foi encontrado no catálogo (`GET /municipios`).",
    "",
    "**Limite:** 20 requisições por minuto por IP.",
  ].join("\n"),
  params: toJsonSchema(findCnpjParamsSchema),
  response: {
    200: object("Dados cadastrais do CNPJ.", {
      cnpj: field.string("CNPJ só com dígitos.", "11222333000181"),
      razaoSocial: field.string("Razão social.", "MERCADO SAO JOSE LTDA"),
      nomeFantasia: field.nullableString("Nome fantasia.", "MERCADO SAO JOSE"),
      situacaoCadastral: field.string(
        "Situação na Receita (ex.: Ativa, Baixada, Inapta, Suspensa).",
        "Ativa",
      ),
      porte: field.nullableString("Porte da empresa.", "Micro Empresa"),
      atividadePrincipal: field.nullableString(
        "Descrição do CNAE principal.",
        "Comércio varejista de mercadorias em geral",
      ),
      cnaePrincipal: {
        type: "object",
        nullable: true,
        description: "Código e descrição do CNAE principal.",
        properties: {
          codigo: field.string("Código CNAE.", "4711302"),
          descricao: field.string(
            "Descrição do CNAE.",
            "Comércio varejista de mercadorias em geral",
          ),
        },
        required: ["codigo", "descricao"],
      },
      cnaes: {
        type: "array",
        description: "Lista de CNAEs (principal e secundários) registrados na Receita.",
        items: object("Item de CNAE.", {
          codigo: field.string("Código CNAE.", "4711302"),
          descricao: field.string("Descrição da atividade.", "Comércio varejista de mercadorias em geral"),
          isPrincipal: {
            type: "boolean",
            description: "Indica se é o CNAE principal.",
            example: true,
          },
        }),
      },
      municipio: object("Município do endereço.", {
        nome: field.string("Nome como gravado na Receita.", "AMONTADA"),
        uf: field.string("UF.", "CE"),
        codigoIbge: {
          type: "integer",
          nullable: true,
          description: "Código IBGE no catálogo, ou `null` se não encontrado.",
          example: 2300705,
        },
      }),
      telefone: field.nullableString("Telefone principal só com dígitos.", "8836361234"),
      email: field.nullableString("E-mail cadastrado na Receita.", "contato@mercado.com.br"),
    }),
    400: validationErrorResponse,
    404: errorResponse(
      "O CNPJ não existe na base da Receita.",
      "CNPJ não encontrado na Receita Federal",
    ),
    429: tooManyRequestsResponse,
    502: errorResponse(
      "A consulta externa falhou ou está indisponível.",
      "Não foi possível consultar o CNPJ na Receita Federal agora.",
    ),
  },
};

export { findCnpjDocs };
