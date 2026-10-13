import axios from "axios";
import axiosRetry, { exponentialDelay, isNetworkOrIdempotentRequestError } from "axios-retry";

import { env } from "../../env";

const openCnpjApi = axios.create({
  baseURL: env.OPEN_CNPJ_API,
  timeout: 10_000,
  headers: { Accept: "application/json" },
});

axiosRetry(openCnpjApi, {
  retries: 2,
  retryDelay: exponentialDelay,
  retryCondition: (error) =>
    isNetworkOrIdempotentRequestError(error) || error.code === "ECONNABORTED",
});

export { openCnpjApi };
