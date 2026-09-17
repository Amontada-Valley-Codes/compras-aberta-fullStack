import axios from "axios";
import { attachInterceptors } from "./interceptors";

const common = { timeout: 20_000, headers: { Accept: "application/json" } };

export const api = attachInterceptors(
  axios.create({
    ...common,
    baseURL: process.env.API_BASE_URL ?? process.env.BACKEND_URL ?? "http://localhost:3333",
  }),
);

// The public catalog includes both IBGE and TCE codes; the Fastify /municipios route only returns IBGE.
export const catalogApi = attachInterceptors(
  axios.create({
    ...common,
    baseURL: process.env.ANALYTICS_API_BASE_URL ?? "https://compra-aberta-api.onrender.com",
  }),
);
