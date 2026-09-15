import { prisma } from "../src/lib/prisma";

const IBGE_CEARA_MUNICIPIOS_URL =
  "https://servicodados.ibge.gov.br/api/v1/localidades/estados/23/municipios";

type MunicipioIbge = {
  id: number;
  nome: string;
};

function isMunicipioIbge(value: unknown): value is MunicipioIbge {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const municipio = value as Record<string, unknown>;

  return (
    typeof municipio.id === "number" &&
    Number.isInteger(municipio.id) &&
    typeof municipio.nome === "string" &&
    municipio.nome.trim().length > 0
  );
}

async function buscarMunicipiosDoCeara(): Promise<MunicipioIbge[]> {
  const response = await fetch(IBGE_CEARA_MUNICIPIOS_URL, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `Não foi possível consultar o IBGE: ${response.status} ${response.statusText}`,
    );
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data) || !data.every(isMunicipioIbge)) {
    throw new Error("A resposta da API do IBGE não possui o formato esperado.");
  }

  return data.map(({ id, nome }) => ({ id, nome: nome.trim() }));
}

async function main() {
  const municipios = await buscarMunicipiosDoCeara();

  const { count } = await prisma.municipios.createMany({
    data: municipios.map(({ id, nome }) => ({
      codigo_ibge: id,
      nome,
    })),
    skipDuplicates: true,
  });

  console.log(
    `${count} municípios inseridos; ${municipios.length} municípios recebidos do IBGE.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
