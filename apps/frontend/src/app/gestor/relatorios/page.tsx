import type { Metadata } from "next";
import { GestorPublicoRelatorios } from "@/features/dashboard/gestor-publico/GestorPublicoRelatorios";
import {
  DEFAULT_GESTOR_MUNICIPALITY_IBGE,
  defaultGestorYear,
  getGestorAccess,
  getMunicipalityOptions,
  gestorHomeMunicipality,
} from "@/features/dashboard/gestor/gestor-context";
import { KNOWN_NATURE_CODES, natureLabel } from "@/features/public-data/plain-language";
import { GESTOR_YEARS } from "@/schemas/analytics/gestor-page.schema";

export const metadata: Metadata = { title: "Relatórios | Gestor Público | Compras Abertas" };

// O relatório usa os dados reais do município: a lista vem do catálogo da API
// e o seletor abre na prefeitura da conta do gestor.
export default async function GestorRelatoriosPage() {
  const [access, municipalities] = await Promise.all([getGestorAccess(), getMunicipalityOptions()]);
  const defaultMunicipality = access && access.kind !== "error" ? gestorHomeMunicipality(access) : DEFAULT_GESTOR_MUNICIPALITY_IBGE;

  return (
    <GestorPublicoRelatorios
      municipalities={municipalities.data?.map((item) => ({ value: item.ibgeCode, label: item.name })) ?? []}
      defaultMunicipality={defaultMunicipality}
      years={GESTOR_YEARS}
      defaultYear={defaultGestorYear()}
      natures={KNOWN_NATURE_CODES.map((code) => ({ value: code, label: natureLabel(code) }))}
    />
  );
}
