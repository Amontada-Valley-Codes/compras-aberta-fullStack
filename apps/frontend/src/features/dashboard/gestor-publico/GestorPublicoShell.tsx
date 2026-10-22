"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  FileBarChart,
  LayoutDashboard,
  Map,
  Scale,
  Users,
} from "lucide-react";
import { AppShell, type NavItem } from "@/features/dashboard/AppShell";

const items: NavItem[] = [
  { id: "overview", label: "Visão geral", icon: <LayoutDashboard size={19} /> },
  { id: "municipios", label: "Municípios", icon: <Building2 size={19} /> },
  { id: "fornecedores", label: "Fornecedores", icon: <Users size={19} /> },
  { id: "comparativos", label: "Comparativos", icon: <Scale size={19} /> },
  { id: "diagnostico-territorial", label: "Diagnóstico territorial", icon: <Map size={19} /> },
  { id: "relatorios", label: "Relatórios", icon: <FileBarChart size={19} /> },
];

function activeId(pathname: string, basePath: string): string {
  if (pathname === basePath) return "overview";
  return items.find((item) => item.id !== "overview" && pathname.startsWith(`${basePath}/${item.id}`))?.id ?? "overview";
}

function hrefFor(id: string, basePath: string): string {
  return id === "overview" ? basePath : `${basePath}/${id}`;
}

/**
 * O gestor público usa o mesmo AppShell da Administração e da ME, com a
 * navegação protegida pela área autenticada de /gestor.
 */
export function GestorPublicoShell({ children, basePath = "/gestor", userName }: { children: React.ReactNode; basePath?: string; userName?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <AppShell
      role="gestor-publico"
      active={activeId(pathname, basePath)}
      onNavigate={(id) => router.push(hrefFor(id, basePath))}
      items={items}
      portalHref="/analise"
      userName={userName}
    >
      {children}
    </AppShell>
  );
}
