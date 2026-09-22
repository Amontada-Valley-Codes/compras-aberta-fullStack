import type { SwaggerOptions } from "@fastify/swagger";
import type { FastifySwaggerUiOptions } from "@fastify/swagger-ui";

import { apiDescription } from "./api-description";

const swaggerOptions: SwaggerOptions = {
  openapi: {
    openapi: "3.0.3",
    info: {
      title: "Compras Abertas API",
      version: "1.0.0",
      description: apiDescription,
    },
    tags: [
      {
        name: "Autenticação",
        description: "Cadastro de usuários e login com JWT.",
      },
      {
        name: "Municípios",
        description: "Catálogo de municípios do Ceará.",
      },
      {
        name: "Analytics",
        description:
          "Licitações e indicadores de participação de microempresas, vindos da API externa de dados.",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Token retornado por `POST /sessions`. Envie como `Authorization: Bearer <token>`.",
        },
      },
    },
  },
};

const swaggerUiOptions: FastifySwaggerUiOptions = {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "list",
    deepLinking: true,
    persistAuthorization: true,
  },
};

export { swaggerOptions, swaggerUiOptions };
