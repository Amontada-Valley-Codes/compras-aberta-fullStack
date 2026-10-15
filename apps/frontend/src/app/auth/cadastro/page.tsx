import type { Metadata } from "next";
import { listMunicipalitiesService } from "@/services/municipalities/list-municipalities.service";
import type { Municipality } from "@/services/municipalities/municipalities.types";
import { CadastroWizard } from "./components/CadastroWizard";

export const metadata: Metadata = {
  title: "Cadastro | Compras Abertas",
  description:
    "Crie sua conta no Compras Abertas como microempresa (ME) ou como gestor público municipal.",
};

type CadastroPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function CadastroPage({ searchParams }: CadastroPageProps) {
  // ?perfil=me ou ?perfil=gestor abre direto no fluxo (links do login e da landing).
  const { perfil } = await searchParams;
  const initialProfile = perfil === "me" || perfil === "gestor" ? perfil : null;

  // A lista é usada pelo Gestor Público. Sem ela o formulário ainda abre, mas o
  // select avisa que não carregou (e o backend recusa o envio sem município).
  let municipalities: Municipality[] = [];
  let municipalitiesError = false;

  try {
    municipalities = await listMunicipalitiesService();
  } catch {
    municipalitiesError = true;
  }

  return (
    <CadastroWizard
      municipalities={municipalities}
      municipalitiesError={municipalitiesError}
      initialProfile={initialProfile}
    />
  );
}
