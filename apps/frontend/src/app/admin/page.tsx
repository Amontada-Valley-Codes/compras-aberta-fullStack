import type { Metadata } from "next";
import { AdminDashboard } from "@/features/dashboard/AdminDashboard";

export const metadata: Metadata = {
  title: "Administração | Compras Abertas",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
