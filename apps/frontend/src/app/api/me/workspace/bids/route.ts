import { proxyRadarRequest } from "../../radar/_proxy";

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  return proxyRadarRequest("/me/workspace/bids", {
    method: "PUT",
    body,
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const bidControlId = searchParams.get("bidControlId") ?? "";
  return proxyRadarRequest(
    `/me/workspace/bids?bidControlId=${encodeURIComponent(bidControlId)}`,
    {
      method: "DELETE",
    },
  );
}
