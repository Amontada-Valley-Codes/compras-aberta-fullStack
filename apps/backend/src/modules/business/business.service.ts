import { hash } from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { validateFile } from "../../utils/upload";
import { userRepository } from "../users/user.repository";
import { businessRepository } from "./business.repository";
import type { RegisterBusinessDTO } from "./business.schema";
import type { PorteEmpresa } from "../../../prisma/generated/prisma/client";

interface UploadedFile {
  filename: string;
  mimetype: string;
  data: Buffer;
}

interface BusinessFiles {
  cartao_cnpj: UploadedFile;
  contrato_social: UploadedFile;
  comprovante_endereco: UploadedFile;
  comprovante_socio: UploadedFile;
}

export const businessService = {
  async register(data: RegisterBusinessDTO, files: BusinessFiles) {
    const userExists = await userRepository.findByEmail(data.email);
    if (userExists) {
      throw new AppError("E-mail já cadastrado", 409);
    }

    const cnpjExists = await businessRepository.findByCnpj(data.cnpj);
    if (cnpjExists) {
      throw new AppError("CNPJ já cadastrado", 409);
    }

    const fileList = [
      files.cartao_cnpj,
      files.contrato_social,
      files.comprovante_endereco,
      files.comprovante_socio,
    ];

    for (const file of fileList) {
      validateFile(file.mimetype, file.data.length);
    }

    const hashedPassword = await hash(data.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          cnpj: data.cnpj,
          name_businss: data.nome_empresa,
          porte_empresa: data.porte_empresa as PorteEmpresa,
          cartaoCnpjData: files.cartao_cnpj.data,
          cartaoCnpjMimeType: files.cartao_cnpj.mimetype,
          contratoSocialData: files.contrato_social.data,
          contratoSocialMimeType: files.contrato_social.mimetype,
          comprovanteEnderecoData: files.comprovante_endereco.data,
          comprovanteEnderecoMimeType: files.comprovante_endereco.mimetype,
          comprovanteSocioData: files.comprovante_socio.data,
          comprovanteSocioMimeType: files.comprovante_socio.mimetype,
        },
      });

      const user = await tx.user.create({
        data: {
          name: data.usuario,
          email: data.email,
          password: hashedPassword,
          role: "BUSINESS",
          cnpj: data.cnpj,
          isActive: false, // Inicia inativo aguardando aprovação do Admin
        },
      });

      return { user, business };
    });

    return {
      status: "PENDING",
      message: "Solicitação cadastral enviada com sucesso! Seus dados e documentos estão sob análise do administrador.",
      user: {
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        isActive: result.user.isActive,
        createdAt: result.user.createdAt,
      },
      business: {
        cnpj: result.business.cnpj,
        nome_empresa: result.business.name_businss,
        porte_empresa: result.business.porte_empresa,
      },
    };
  },
};
