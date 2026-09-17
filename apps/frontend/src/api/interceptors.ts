import type { AxiosInstance } from "axios";
import { normalizeApiError } from "./errors";

export function attachInterceptors(client: AxiosInstance): AxiosInstance {
  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => Promise.reject(normalizeApiError(error)),
  );
  return client;
}
