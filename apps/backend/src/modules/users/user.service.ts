import { hash } from "bcryptjs";


import { userRepository } from "./user.repository";
import type { CreateUserDTO } from "./user.types";
import { AppError } from "../../utils/AppError";

const userService = {
  
  async create({ name, email, password }: CreateUserDTO) {
    const normalizedEmail = email.trim().toLowerCase();

    const userAlreadyExists =
      await userRepository.findByEmail(normalizedEmail);

    if (userAlreadyExists) {
      throw new AppError("E-mail já cadastrado", 409);
    }

    const passwordHash = await hash(password, 10);

    const user = await userRepository.create({
      name: name.trim(),
      email: normalizedEmail,
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