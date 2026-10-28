import type { Metadata } from "next";
import { ContactPage } from "@/features/institutional/ContactPage";

export const metadata: Metadata = {
  title: "Contato | Compras Abertas",
};

export default function ContatoPage() {
  return <ContactPage />;
}
