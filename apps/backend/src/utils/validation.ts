import { z } from "zod";

// Campos reutilizados por mais de um módulo. A normalização (trim, minúsculas)
// acontece aqui, na borda, para que services e repositories só recebam dados
// já no formato canônico.

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "E-mail muito longo")
  .pipe(z.email("E-mail inválido"));

// bcrypt só considera os primeiros 72 bytes; acima disso, senhas diferentes
// com o mesmo prefixo gerariam o mesmo hash.
const password = z
  .string()
  .min(6, "Senha deve ter pelo menos 6 caracteres")
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Senha deve ter no máximo 72 bytes",
  );

export { email, password };
