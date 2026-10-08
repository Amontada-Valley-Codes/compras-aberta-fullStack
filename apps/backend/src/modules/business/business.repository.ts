import { prisma } from "../../lib/prisma";
import type { PorteEmpresa } from "../../../prisma/generated/prisma/client";

export interface CreateBusinessData {
  cnpj: string;
  name_businss: string;
  porte_empresa: PorteEmpresa;
  cartaoCnpjPath: string;
  cartaoCnpjMimeType: string;
  contratoSocialPath: string;
  contratoSocialMimeType: string;
  comprovanteEnderecoPath: string;
  comprovanteEnderecoMimeType: string;
  comprovanteSocioPath: string;
  comprovanteSocioMimeType: string;
}

export const businessRepository = {
  async findByCnpj(cnpj: string) {
    return prisma.business.findUnique({
      where: { cnpj },
    });
  },

  async create(data: CreateBusinessData) {
    return prisma.business.create({
      data,
    });
  },
};
