import axios from "axios";

import { env } from "../../env";

const analyticsApi = axios.create({
  baseURL: env.API_DADOS,
  timeout: 15_000,
});

export { analyticsApi };
