import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import fastify from "fastify";
import path from "node:path";
import { swaggerOptions, swaggerUiOptions } from "./docs/openapi";
import { env } from "./env";
import { errorHandling } from "./middlewares/error-handling";
import { routes } from "./routes";

export const app = fastify({ trustProxy: env.TRUST_PROXY });

app.setValidatorCompiler(() => () => true);
app.setSerializerCompiler(() => (data) => JSON.stringify(data));

app.setErrorHandler(errorHandling);
app.register(cors, { origin: env.CORS_ORIGIN });
app.register(rateLimit, {
  global: false,
  errorResponseBuilder: (_request, context) => ({
    statusCode: context.statusCode,
    message: `Muitas requisições. Tente novamente em ${context.after}.`,
  }),
});
app.register(fastifyStatic, {
  root: path.resolve(__dirname, "..", "uploads"),
  prefix: "/uploads/",
  decorateReply: false,
});
app.register(swagger, swaggerOptions);
app.register(swaggerUi, swaggerUiOptions);
app.register(routes);
