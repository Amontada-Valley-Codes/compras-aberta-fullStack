import { proxyRadarRequest } from "../_proxy";

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  return proxyRadarRequest("/me/radar/bids", { method: "PUT", body });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return proxyRadarRequest("/me/radar/bids/sync", { method: "POST", body });
}
