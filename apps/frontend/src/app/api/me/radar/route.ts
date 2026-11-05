import { proxyRadarRequest } from "./_proxy";

export async function GET() {
  return proxyRadarRequest("/me/radar");
}
