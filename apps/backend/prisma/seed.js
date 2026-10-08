"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../src/lib/prisma");
const IBGE_CEARA_MUNICIPIOS_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/estados/23/municipios";
function isMunicipioIbge(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const municipio = value;
    return (typeof municipio.id === "number" &&
        Number.isInteger(municipio.id) &&
        typeof municipio.nome === "string" &&
        municipio.nome.trim().length > 0);
}
async function buscarMunicipiosDoCeara() {
    const response = await fetch(IBGE_CEARA_MUNICIPIOS_URL, {
        headers: { Accept: "application/json" },
    });
    if (!response.ok) {
        throw new Error(`Não foi possível consultar o IBGE: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (!Array.isArray(data) || !data.every(isMunicipioIbge)) {
        throw new Error("A resposta da API do IBGE não possui o formato esperado.");
    }
    return data.map(({ id, nome }) => ({ id, nome: nome.trim() }));
}
async function main() {
    const municipios = await buscarMunicipiosDoCeara();
    const { count } = await prisma_1.prisma.municipios.createMany({
        data: municipios.map(({ id, nome }) => ({
            codigo_ibge: id,
            nome,
        })),
        skipDuplicates: true,
    });
    console.log(`${count} municípios inseridos; ${municipios.length} municípios recebidos do IBGE.`);
}
main()
    .catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma_1.prisma.$disconnect();
});
