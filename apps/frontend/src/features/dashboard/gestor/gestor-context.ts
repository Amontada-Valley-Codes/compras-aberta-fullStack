import { cache } from "react";
import { loadMunicipalityOptions } from "@/features/public-data/public-data";
import { GESTOR_YEARS, gestorPageSchema } from "@/schemas/analytics/gestor-page.schema";
import type { MunicipalityOption } from "@/services/municipalities/municipalities.types";
import { loadGestorAccess, type GestorAccess } from "./gestor-session";

// Sem "use client": usado pelo layout e pelas páginas de /gestor. O cache()
// do React faz o layout e a página dividirem a mesma consulta na requisição.

// Município aberto quando a URL não traz ?municipio= e a conta não tem prefeitura vinculada.
export const DEFAULT_GESTOR_MUNICIPALITY_IBGE = "2300754";

export const getGestorAccess = cache(loadGestorAccess);

// A lista de municípios vem da API de dados, que às vezes demora a acordar e
// falha na primeira consulta: tenta mais uma vez antes de desistir.
export const getMunicipalityOptions = cache(async () => {
  const first = await loadMunicipalityOptions();
  if (first.data) return first;
  await new Promise((resolve) => setTimeout(resolve, 1_500));
  return loadMunicipalityOptions();
});

// Ano corrente quando a fonte já tem dados dele; senão, o mais recente.
export function defaultGestorYear(): number {
  const current = new Date().getUTCFullYear();
  return (GESTOR_YEARS as readonly number[]).includes(current) ? current : GESTOR_YEARS[0];
}

export interface GestorContext {
  municipality: MunicipalityOption | null;
  municipalityIbge: string;
  year: number;
}

// Prefeitura que abre ao entrar: a da conta do gestor ou, sem vínculo (e para
// o administrador), a padrão.
export function gestorHomeMunicipality(access: GestorAccess): string {
  return (access.kind === "manager" && access.municipalityIbge) || DEFAULT_GESTOR_MUNICIPALITY_IBGE;
}

// Os dados são públicos: qualquer conta com acesso ao painel escolhe o
// município pelo seletor do cabeçalho (?municipio=). O layout já barrou quem
// não pode entrar, então aqui só resolve o recorte da página.
export async function resolveGestorContext(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<GestorContext | null> {
  const [access, params] = await Promise.all([getGestorAccess(), searchParams]);
  if (!access || access.kind === "error") return null;

  const parsed = gestorPageSchema.parse(params);
  const municipalityIbge = parsed.municipio ?? gestorHomeMunicipality(access);
  const municipalities = await getMunicipalityOptions();

  return {
    municipality: municipalities.data?.find((item) => item.ibgeCode === municipalityIbge) ?? null,
    municipalityIbge,
    year: parsed.ano ?? defaultGestorYear(),
  };
}
