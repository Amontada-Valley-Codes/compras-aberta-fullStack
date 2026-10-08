import type { Metadata } from "next";
import { AccessRequest } from "@/app/components/auth/access-request";
import { listMunicipalitiesService } from "@/services/municipalities/list-municipalities.service";
import type { Municipality } from "@/services/municipalities/municipalities.types";

export const metadata: Metadata = {
  title: "Solicitar acesso | Compras Abertas",
};

export default async function AccessRequestPage() {
  // Sem a lista o formulário ainda abre, mas o select avisa que não carregou
  // (e o backend recusa o envio sem município).
  let municipalities: Municipality[] = [];
  let municipalitiesError = false;

  try {
    municipalities = await listMunicipalitiesService();
  } catch {
    municipalitiesError = true;
  }

  return (
    <AccessRequest municipalities={municipalities} municipalitiesError={municipalitiesError} />
  );
}
