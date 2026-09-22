import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";

import { authConfig } from "../../configs/auth";
import { AppError } from "../../utils/AppError";
import { userRepository } from "../users/user.repository";

interface CreateSessionDTO {
  email: string;
  password: string;
}

const sessionService = {
  async create({ email, password }: CreateSessionDTO) {
    const user = await userRepository.findByEmail(email.trim().toLowerCase());

    if (!user) {
      throw new AppError("E-mail ou senha inválidos", 401);
    }

    const passwordMatched = await compare(password, user.password);

    if (!passwordMatched) {
      throw new AppError("E-mail ou senha inválidos", 401);
    }

    if (!user.isActive) {
      throw new AppError("Usuário desativado", 403);
    }

    const token = sign({ role: user.role }, authConfig.jwt.secret, {
      subject: user.id,
      expiresIn: authConfig.jwt.expiresIn,
      algorithm: "HS256",
    });

    return { token };
  },
};

export { sessionService };
