import { proxyRadarRequest } from "../../../radar/_proxy";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  return proxyRadarRequest(
    `/me/workspace/reminders/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body,
    },
  );
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return proxyRadarRequest(
    `/me/workspace/reminders/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );
}
