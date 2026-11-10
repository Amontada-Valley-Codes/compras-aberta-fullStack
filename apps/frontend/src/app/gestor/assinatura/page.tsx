import type { Metadata } from "next";
import { SubscriptionManagementView } from "@/features/dashboard/SubscriptionManagementView";

export const metadata: Metadata = {
  title: "Minha Assinatura · Gestor Público | Compras Abertas",
};

export default function GestorAssinaturaPage() {
  return <SubscriptionManagementView role="MANAGER" />;
}
