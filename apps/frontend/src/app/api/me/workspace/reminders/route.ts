import { proxyRadarRequest } from "../../radar/_proxy";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return proxyRadarRequest("/me/workspace/reminders", {
    method: "POST",
    body,
  });
}
