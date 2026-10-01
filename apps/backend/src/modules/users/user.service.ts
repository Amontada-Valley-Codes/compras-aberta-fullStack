import { hash } from "bcryptjs";

import { AppError } from "../../utils/AppError";
import { userRepository } from "./user.repository";
import type { CreateUserDTO } from "./user.schema";

const userService = {
  // Espera dados já normalizados por createUserSchema (e-mail em minúsculas,
  // nome sem espaços nas pontas).
  async create({ name, email, password }: CreateUserDTO) {
    const userAlreadyExists = await userRepository.findByEmail(email);

    if (userAlreadyExists) {
      throw new AppError("E-mail já cadastrado", 409);
    }

    const passwordHash = await hash(password, 10);

    const user = await userRepository.create({
      name,
      email,
      password: passwordHash,
      role: "BUSINESS",
    });

    return {
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  },
};

export { userService };
