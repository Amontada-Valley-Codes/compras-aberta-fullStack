import { AppError } from "../../utils/AppError";
import { userRepository } from "./user.repository";

const userService = {
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      cnpj: user.cnpj,
      business: user.business
        ? {
            cnpj: user.business.cnpj,
            nome_empresa: user.business.name_businss,
            porte_empresa: user.business.porte_empresa,
            url_cartao_cnpj: `/admin/business-requests/${user.business.cnpj}/document/cartao_cnpj`,
            url_contrato_social: `/admin/business-requests/${user.business.cnpj}/document/contrato_social`,
            url_comprovante_endereco: `/admin/business-requests/${user.business.cnpj}/document/comprovante_endereco`,
            url_comprovante_socio: `/admin/business-requests/${user.business.cnpj}/document/comprovante_socio`,
          }
        : null,
    };
  },
};

export { userService };
