import type { Metadata } from "next";
import { TermsPage } from "@/features/institutional/TermsPage";

export const metadata: Metadata = {
  title: "Termos e compromissos | Compras Abertas",
};

export default function TermosPage() {
  return <TermsPage />;
}
