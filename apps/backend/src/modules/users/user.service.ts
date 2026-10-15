import { hash } from "bcryptjs";
import { AppError } from "../../utils/AppError";
import { userRepository } from "./user.repository";

interface CreateAdminInput {
  name: string;
  email: string;
  password: string;
}

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
      municipioIbge: user.municipioIbge,
      business: user.business
        ? {
            cnpj: user.business.cnpj,
            nome_empresa: user.business.name_businss,
            porte_empresa: user.business.porte_empresa,
            url_cartao_cnpj: `/api/admin/documents/${user.business.cnpj}/cartao_cnpj`,
            url_contrato_social: `/api/admin/documents/${user.business.cnpj}/contrato_social`,
            url_comprovante_endereco: `/api/admin/documents/${user.business.cnpj}/comprovante_endereco`,
            url_comprovante_socio: `/api/admin/documents/${user.business.cnpj}/comprovante_socio`,
          }
        : null,
    };
  },

  async listAdmins() {
    return userRepository.listAdmins();
  },

  async createAdmin({ name, email, password }: CreateAdminInput) {
    const cleanEmail = email.trim().toLowerCase();
    const existing = await userRepository.findByEmail(cleanEmail);

    if (existing) {
      throw new AppError("Já existe um usuário cadastrado com este e-mail.", 409);
    }

    const passwordHash = await hash(password, 10);

    return userRepository.createAdmin({
      name: name.trim(),
      email: cleanEmail,
      password: passwordHash,
    });
  },

  async deleteAdmin(targetId: string, currentAdminId: string) {
    if (targetId === currentAdminId) {
      throw new AppError("Você não pode remover seu próprio acesso de administrador.", 400);
    }

    const target = await userRepository.findById(targetId);
    if (!target || target.role !== "ADMIN") {
      throw new AppError("Administrador não encontrado.", 404);
    }

    const totalAdmins = await userRepository.countAdmins();
    if (totalAdmins <= 1) {
      throw new AppError("Não é possível remover o único administrador ativo do sistema.", 400);
    }

    await userRepository.deleteAdmin(targetId);

    return { message: "Administrador removido com sucesso." };
  },
};

export { userService };
