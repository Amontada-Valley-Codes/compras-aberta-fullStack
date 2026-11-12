import axios from "axios";
import { attachInterceptors } from "./interceptors";

const common = { timeout: 20_000, headers: { Accept: "application/json" } };

const serverBaseURL =
  process.env.API_BASE_URL ?? process.env.BACKEND_URL ?? "http://localhost:3333";

export const api = attachInterceptors(
  axios.create({
    ...common,
    baseURL:
      typeof window === "undefined"
        ? serverBaseURL
        : (process.env.NEXT_PUBLIC_API_BASE_URL ?? ""),
  }),
);

// The public catalog includes both IBGE and TCE codes; the Fastify /municipios route only returns IBGE.
export const catalogApi = attachInterceptors(
  axios.create({
    ...common,
    baseURL: process.env.ANALYTICS_API_BASE_URL ?? "https://comprasabertas.amontadavalley.com.br/api-dados",
  }),
);

// Sem attachInterceptors: as rotas de sessão (/sessions, /sessions/refresh,
// /sessions/logout) já devolvem mensagens em pt-BR prontas para o usuário
// (ex.: "E-mail ou senha inválidos"), e o normalizeApiError as substituiria
// por textos genéricos pensados para as rotas de analytics.
export const authApi = axios.create({
  ...common,
  baseURL: process.env.API_BASE_URL ?? process.env.BACKEND_URL ?? "http://localhost:3333",
});
