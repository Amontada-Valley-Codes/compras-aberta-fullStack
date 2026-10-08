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
      config: {
        rateLimit: {
          max: 3,
          timeWindow: "10 minutes",
        },
      },
    },
    businessController.register,
  );
}

export { businessRoutes };
