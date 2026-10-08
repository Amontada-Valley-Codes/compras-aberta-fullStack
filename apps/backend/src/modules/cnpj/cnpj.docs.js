"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findCnpjDocs = void 0;
const helpers_1 = require("../../docs/helpers");
const cnpj_schema_1 = require("./cnpj.schema");
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
    params: (0, helpers_1.toJsonSchema)(cnpj_schema_1.findCnpjParamsSchema),
    response: {
        200: (0, helpers_1.object)("Dados cadastrais do CNPJ.", {
            cnpj: helpers_1.field.string("CNPJ só com dígitos.", "11222333000181"),
            razaoSocial: helpers_1.field.string("Razão social.", "MERCADO SAO JOSE LTDA"),
            nomeFantasia: helpers_1.field.nullableString("Nome fantasia.", "MERCADO SAO JOSE"),
            situacaoCadastral: helpers_1.field.string("Situação na Receita (ex.: Ativa, Baixada, Inapta, Suspensa).", "Ativa"),
            porte: helpers_1.field.nullableString("Porte da empresa.", "Micro Empresa"),
            atividadePrincipal: helpers_1.field.nullableString("Descrição do CNAE principal.", "Comércio varejista de mercadorias em geral"),
            municipio: (0, helpers_1.object)("Município do endereço.", {
                nome: helpers_1.field.string("Nome como gravado na Receita.", "AMONTADA"),
                uf: helpers_1.field.string("UF.", "CE"),
                codigoIbge: {
                    type: "integer",
                    nullable: true,
                    description: "Código IBGE no catálogo, ou `null` se não encontrado.",
                    example: 2300705,
                },
            }),
            telefone: helpers_1.field.nullableString("Telefone principal só com dígitos.", "8836361234"),
            email: helpers_1.field.nullableString("E-mail cadastrado na Receita.", "contato@mercado.com.br"),
        }),
        400: helpers_1.validationErrorResponse,
        404: (0, helpers_1.errorResponse)("O CNPJ não existe na base da Receita.", "CNPJ não encontrado na Receita Federal"),
        429: helpers_1.tooManyRequestsResponse,
        502: (0, helpers_1.errorResponse)("A consulta externa falhou ou está indisponível.", "Não foi possível consultar o CNPJ na Receita Federal agora."),
    },
};
exports.findCnpjDocs = findCnpjDocs;
