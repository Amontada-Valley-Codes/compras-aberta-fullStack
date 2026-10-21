import { prisma } from "../../lib/prisma";

interface ListMunicipiosDTO {
  search?: string;
}

const municipioService = {
  async list({ search }: ListMunicipiosDTO) {
    const codigoIbge = search && /^\d+$/.test(search) ? Number(search) : undefined;

    const municipios = await prisma.municipios.findMany({
      where: search
        ? codigoIbge !== undefined
          ? { codigo_ibge: codigoIbge }
          : { nome: { contains: search, mode: "insensitive" } }
        : undefined,
      select: {
        codigo_ibge: true,
        nome: true,
      },
      orderBy: { nome: "asc" },
    });

    return municipios.map(({ codigo_ibge, nome }) => ({
      id: codigo_ibge,
      nome,
    }));
  },
};

export { municipioService };
