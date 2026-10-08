"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMunicipiosDocs = void 0;
const helpers_1 = require("../../docs/helpers");
const municipio_schema_1 = require("./municipio.schema");
const listMunicipiosDocs = {
    tags: ["Municípios"],
    summary: "Listar municípios do Ceará",
    description: [
        "Devolve o catálogo de municípios cearenses, **ordenado por nome**. Os dados vêm do banco, alimentado pelo seed a partir da API de localidades do IBGE.",
        "",
        "Use o parâmetro `search` para filtrar:",
        "",
        "- somente dígitos (ex.: `2304400`) → busca pelo **código IBGE exato**;",
        "- qualquer outro texto (ex.: `fort`) → busca pelo **nome** (contém, sem diferenciar maiúsculas de minúsculas).",
        "",
        "> O `id` retornado é o código **IBGE**. As rotas de `/analytics` esperam o código **TCE-CE** em `codigo_municipio`, que é outro.",
    ].join("\n"),
    querystring: (0, helpers_1.toJsonSchema)(municipio_schema_1.listMunicipiosQuerySchema),
    response: {
        200: {
            description: "Lista de municípios (vazia se nada corresponder ao filtro).",
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: helpers_1.field.integer("Código IBGE do município.", 2304400),
                    nome: helpers_1.field.nullableString("Nome do município.", "Fortaleza"),
                },
                required: ["id", "nome"],
            },
        },
        400: helpers_1.validationErrorResponse,
    },
};
exports.listMunicipiosDocs = listMunicipiosDocs;
