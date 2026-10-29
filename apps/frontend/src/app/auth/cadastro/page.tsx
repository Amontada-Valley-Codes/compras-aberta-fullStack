import type { Metadata } from "next";
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

  return <CadastroWizard initialProfile={initialProfile} />;
}
