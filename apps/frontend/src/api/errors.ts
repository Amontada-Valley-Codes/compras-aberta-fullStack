import axios from "axios";

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 404) return new ApiError("Dados não encontrados.", status);
    // 400 vem do backend Fastify (Zod); 422 vem da API de dados externa.
    if (status === 400 || status === 422) return new ApiError("Os filtros enviados são inválidos.", status);
    if (status === 429) return new ApiError("Muitas consultas em pouco tempo. Aguarde um instante e tente de novo.", status);
    if (status && status >= 500) return new ApiError("A fonte de dados está indisponível.", status);
    return new ApiError("Não foi possível consultar os dados públicos.", status);
  }
  return new ApiError("Não foi possível processar a resposta da API.");
}
