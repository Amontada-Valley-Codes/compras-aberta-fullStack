import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { NoupeWidget } from "@/components/NoupeWidget";
import { GestorNotice } from "@/features/dashboard/gestor/GestorNotice";
import { GestorRouteShell } from "@/features/dashboard/gestor/GestorRouteShell";
import { loadCompanyDirectory } from "@/features/dashboard/gestor/gestor-api";
import { loadOpenTenders, loadProcurements } from "@/features/dashboard/gestor/pncp-api";
import {
  defaultGestorYear,
  gestorHomeMunicipality,
  getGestorAccess,
  getMunicipalityOptions,
} from "@/features/dashboard/gestor/gestor-context";
import { GESTOR_YEARS } from "@/schemas/analytics/gestor-page.schema";
import "@/features/dashboard/gestor/gestor.css";
import "@/features/dashboard/gestor-publico/gestor-publico.css";

// Estrutura de todas as páginas de /gestor. O proxy.ts já barrou quem não é
// gestor (MANAGER) nem administrador; aqui o perfil é confirmado no backend.
export default async function GestorLayout({ children }: { children: ReactNode }) {
  const [access, municipalities] = await Promise.all([
    getGestorAccess(),
    getMunicipalityOptions(),
  ]);
  if (!access) redirect("/auth/login?next=/gestor");

  if (access.kind === "error") {
    return <GestorNotice title="Não foi possível abrir o painel" message="Não conseguimos confirmar os dados da sua conta agora. Tente novamente em instantes ou saia e entre de novo." />;
  }

  const homeMunicipalityIbge = gestorHomeMunicipality(access);
  // Dispara os pré-carregamentos pesados só depois de liberar a renderização da entrada,
  // para não competir com o login nem saturar a API de dados.
  setTimeout(() => {
    loadCompanyDirectory().catch(() => undefined);
    loadProcurements(homeMunicipalityIbge, defaultGestorYear()).catch(() => undefined);
    loadOpenTenders(homeMunicipalityIbge).catch(() => undefined);
  }, 1_500);

  return (
    <GestorRouteShell
      legacy={{
        municipalities: municipalities.data?.map((item) => ({ value: item.ibgeCode, label: item.name })) ?? [],
        // O município não fica mais travado: todos escolhem pelo seletor.
        lockedMunicipalityIbge: null,
        defaultMunicipalityIbge: homeMunicipalityIbge,
        defaultYear: defaultGestorYear(),
        years: GESTOR_YEARS,
        userName: access.userName,
      }}
    >
      <NoupeWidget />
      {children}
    </GestorRouteShell>
  );
}
