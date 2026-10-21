import axios from "axios";
import axiosRetry, { exponentialDelay, isNetworkOrIdempotentRequestError } from "axios-retry";

import { env } from "../../env";

const analyticsApi = axios.create({
  baseURL: env.API_DADOS,
  timeout: 15_000,
});

axiosRetry(analyticsApi, {
  retries: 2,
  retryDelay: exponentialDelay,
  retryCondition: (error) =>
    isNetworkOrIdempotentRequestError(error) || error.code === "ECONNABORTED",
});

export { analyticsApi };
