import { proxyRadarRequest } from "../radar/_proxy";

export async function GET() {
  return proxyRadarRequest("/me/workspace");
}
