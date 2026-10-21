"use client";

import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Building2, ClipboardList, FileSignature, FileText, Globe, LayoutDashboard, Map as MapIcon, Megaphone, PiggyBank, Wallet, Workflow,
} from "lucide-react";
import { SideMenu, SideMenuProvider, type SideMenuItem } from "@/components/navigation/side-menu/SideMenu";
import { GestorHeader, type FilterOption } from "./GestorHeader";

// Estrutura comum das páginas de /gestor: cabeçalho executivo (com o botão do
// menu ao lado da logo), menu lateral e o conteúdo da página. O município e o
// ano vêm da URL, então o cabeçalho e os links do menu acompanham a página.
export function GestorShell({
  children,
  municipalities,
  lockedMunicipalityIbge,
  defaultMunicipalityIbge,
  defaultYear,
  years,
  userName,
}: {
  children: ReactNode;
  municipalities: FilterOption[];
  // Gestor: sempre o município da conta. Administrador (null): o da URL.
  lockedMunicipalityIbge: string | null;
  defaultMunicipalityIbge: string;
  defaultYear: number;
  years: readonly number[];
  userName: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canChangeMunicipality = lockedMunicipalityIbge === null;

  const requestedMunicipality = searchParams.get("municipio");
  const municipalityIbge = lockedMunicipalityIbge
    ?? (requestedMunicipality && /^\d{7}$/.test(requestedMunicipality) ? requestedMunicipality : defaultMunicipalityIbge);
  const requestedYear = Number(searchParams.get("ano"));
  const year = years.includes(requestedYear) ? requestedYear : defaultYear;
  const municipalityName = municipalities.find((item) => item.value === municipalityIbge)?.label ?? null;

  const query = new URLSearchParams({ ano: String(year), ...(canChangeMunicipality ? { municipio: municipalityIbge } : {}) }).toString();
  // Ordem do ciclo da compra pública: planejar (PCA), publicar (editais),
  // disputar (licitações), contratar; depois as análises.
  const sections: Array<[string, string, ReactNode]> = [
    ["pca", "PCA", <ClipboardList key="pca" />],
    ["editais", "Editais", <Megaphone key="editais" />],
    ["licitacoes", "Licitações", <FileText key="licitacoes" />],
    ["contratos", "Contratos", <FileSignature key="contratos" />],
    ["gastos", "Gastos e investimentos", <Wallet key="gastos" />],
    ["ganhos", "Ganhos", <PiggyBank key="ganhos" />],
    ["fornecedores", "Fornecedores", <Building2 key="fornecedores" />],
    ["mapa", "Mapa", <MapIcon key="mapa" />],
    ["fluxo", "Fluxo das licitações", <Workflow key="fluxo" />],
  ];
  const items: SideMenuItem[] = [
    { id: "overview", label: "Visão geral", icon: <LayoutDashboard />, href: `/gestor?${query}` },
    ...sections.map(([id, label, icon]) => ({ id, label, icon, href: `/gestor/${id}?${query}` })),
  ];
  const footerItems: SideMenuItem[] = [
    { id: "portal", label: "Portal público", icon: <Globe />, href: "/" },
  ];
  const activeId = sections.find(([id]) => pathname.startsWith(`/gestor/${id}`))?.[0] ?? "overview";

  return (
    // Sempre abre recolhido (ao entrar ou recarregar a página).
    <SideMenuProvider defaultCollapsed>
      <div className="gs-page gs-app">
        <GestorHeader
          municipalityIbge={municipalityIbge}
          municipalityName={municipalityName}
          year={year}
          years={years}
          municipalities={municipalities}
          canChangeMunicipality={canChangeMunicipality}
          userName={userName}
        />
        <div className="gs-body">
          <SideMenu items={items} footerItems={footerItems} activeId={activeId} label="Menu do painel do gestor" />
          <div className="gs-content">{children}</div>
        </div>
      </div>
    </SideMenuProvider>
  );
}
