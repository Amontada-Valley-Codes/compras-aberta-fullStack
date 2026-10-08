"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerUiOptions = exports.swaggerOptions = void 0;
const api_description_1 = require("./api-description");
const swaggerOptions = {
    openapi: {
        openapi: "3.0.3",
        info: {
            title: "Compras Abertas API",
            version: "1.0.0",
            description: api_description_1.apiDescription,
        },
        tags: [
            {
                name: "Autenticação",
                description: "Login com JWT e renovação de sessão.",
            },
            {
                name: "Solicitações de acesso",
                description: "Cadastro de microempresas e aprovação do acesso pela administração.",
            },
            {
                name: "CNPJ",
                description: "Dados cadastrais de empresas na base aberta da Receita Federal.",
            },
            {
                name: "Municípios",
                description: "Catálogo de municípios do Ceará.",
            },
            {
                name: "Analytics",
                description: "Licitações e indicadores de participação de microempresas, vindos da API externa de dados.",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "Token retornado por `POST /sessions`. Envie como `Authorization: Bearer <token>`.",
                },
            },
        },
    },
};
exports.swaggerOptions = swaggerOptions;
const swaggerUiOptions = {
    routePrefix: "/docs",
    uiConfig: {
        docExpansion: "list",
        deepLinking: true,
        persistAuthorization: true,
    },
};
exports.swaggerUiOptions = swaggerUiOptions;
