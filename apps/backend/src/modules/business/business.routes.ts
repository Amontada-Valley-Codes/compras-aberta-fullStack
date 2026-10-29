import type { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { businessController } from "./business.controller";
import { registerBusinessDocs } from "./business.docs";
import { MAX_FILE_SIZE } from "../../utils/upload";

async function businessRoutes(app: FastifyInstance) {
  app.register(multipart, {
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 4,
    },
  });

  app.post(
    "/business/register",
    {
      schema: registerBusinessDocs,
      // O botão da tela já trava enquanto envia; o limite só barra abuso.
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
    },
    businessController.register,
  );
}

export { businessRoutes };
