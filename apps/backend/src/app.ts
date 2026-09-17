import cors from "@fastify/cors";
import fastify from "fastify";
import { errorHandling } from "./middlewares/error-handling";
import { routes } from "./routes";

export const app = fastify();

app.setErrorHandler(errorHandling);
app.register(cors, { origin: "*" });
app.register(routes);
