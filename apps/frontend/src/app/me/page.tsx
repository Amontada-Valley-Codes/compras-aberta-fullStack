import { redirect } from "next/navigation";

export default async function MicroempresaPage({
  searchParams,
}: {
  searchParams: Promise<{ oportunidade?: string }>;
}) {
  const params = await searchParams;
  const query = params.oportunidade
    ? `?oportunidade=${encodeURIComponent(params.oportunidade)}`
    : "";
  redirect(`/empresa${query}`);
}
