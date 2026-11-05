import { proxyRadarRequest } from "../_proxy";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return proxyRadarRequest("/me/radar/filters", { method: "POST", body });
}
