import type { Metadata } from "next";
import { RegisterME } from "@/app/components/auth/register-me";

export const metadata: Metadata = {
  title: "Cadastro de Microempresa | Compras Abertas",
  description: "Cadastre sua empresa ME/MEI/EPP para ter acesso à plataforma Compras Abertas.",
};

export default function CadastroMEPage() {
  return <RegisterME />;
}
