import { prisma } from "../../lib/prisma";
import type { PorteEmpresa } from "../../../prisma/generated/prisma/client";

export interface CreateBusinessData {
  cnpj: string;
  name_businss: string;
  porte_empresa: PorteEmpresa;
  cartaoCnpjData: Buffer;
  cartaoCnpjMimeType: string;
  contratoSocialData: Buffer;
  contratoSocialMimeType: string;
  comprovanteEnderecoData: Buffer;
  comprovanteEnderecoMimeType: string;
  comprovanteSocioData: Buffer;
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
