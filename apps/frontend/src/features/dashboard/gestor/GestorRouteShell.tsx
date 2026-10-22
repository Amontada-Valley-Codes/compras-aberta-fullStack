"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { GestorPublicoShell } from "@/features/dashboard/gestor-publico/GestorPublicoShell";
import { GestorShell } from "./GestorShell";
import type { FilterOption } from "./GestorHeader";

type LegacyShellProps = {
  municipalities: FilterOption[];
  lockedMunicipalityIbge: string | null;
  defaultMunicipalityIbge: string;
  defaultYear: number;
  years: readonly number[];
  userName: string;
};

// Estas telas ainda são específicas do fluxo antigo e continuam disponíveis
// para links salvos. O novo painel usa a mesma experiência do Gestor Público
// na raiz e nas áreas de análise, municípios e relatórios.
const LEGACY_PREFIXES = [
  "/gestor/pca",
  "/gestor/editais",
  "/gestor/licitacoes",
  "/gestor/contratos",
  "/gestor/gastos",
  "/gestor/ganhos",
  "/gestor/mapa",
  "/gestor/fluxo",
];

function isLegacyRoute(pathname: string): boolean {
  if (pathname.startsWith("/gestor/fornecedores/")) return true;
  return LEGACY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function GestorRouteShell({ children, legacy }: { children: ReactNode; legacy: LegacyShellProps }) {
  const pathname = usePathname();

  if (isLegacyRoute(pathname)) {
    return <GestorShell {...legacy}>{children}</GestorShell>;
  }

  return <GestorPublicoShell userName={legacy.userName}>{children}</GestorPublicoShell>;
}
