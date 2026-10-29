import type { ReactNode } from "react";
import { redirect } from "next/navigation";
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
  const access = await getGestorAccess();
  if (!access) redirect("/auth/login?next=/gestor");

  if (access.kind === "error") {
    return <GestorNotice title="Não foi possível abrir o painel" message="Não conseguimos confirmar os dados da sua conta agora. Tente novamente em instantes ou saia e entre de novo." />;
  }
  // O cadastro de empresas (cidade de cada fornecedor) é a consulta mais
  // demorada na primeira vez do dia: começa a carregar já na entrada.
  loadCompanyDirectory().catch(() => undefined);
  // Do PNCP, só o que várias páginas usam e é leve (contratações do ano e
  // editais abertos). Contratos e PCA ficam para quando a página for aberta,
  // para não ocupar a fila do limitador de consultas à toa. Pré-carrega a
  // prefeitura que abre ao entrar.
  const homeMunicipalityIbge = gestorHomeMunicipality(access);
  loadProcurements(homeMunicipalityIbge, defaultGestorYear()).catch(() => undefined);
  loadOpenTenders(homeMunicipalityIbge).catch(() => undefined);

  // A entrada é liberada mesmo antes do vínculo do município: sem ele, as
  // telas que usam o recorte da prefeitura abrem na prefeitura padrão, e o
  // seletor do cabeçalho troca para qualquer município.
  const municipalities = await getMunicipalityOptions();

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
      {children}
    </GestorRouteShell>
  );
}
