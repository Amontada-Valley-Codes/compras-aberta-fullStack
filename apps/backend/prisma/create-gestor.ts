// Cria a conta de um gestor público (papel MANAGER), já vinculada ao
// município da prefeitura que ele representa. Uso (dentro de apps/backend):
//
//   npx tsx prisma/create-gestor.ts --nome "Maria Souza" --email maria@prefeitura.ce.gov.br --senha "Senha@123" --municipio 2300754
//
// --municipio é o código IBGE (7 dígitos) e precisa existir na tabela de
// municípios (alimentada pelo seed).
import { parseArgs } from "node:util";
import { hash } from "bcryptjs";
import { z } from "zod";

import { prisma } from "../src/lib/prisma";

const IBGE_ERROR = "--municipio é obrigatório e deve ser o código IBGE de 7 dígitos";

const argsSchema = z.object({
  nome: z.string({ error: "--nome é obrigatório" }).trim().min(2, "--nome deve ter pelo menos 2 caracteres"),
  email: z.string({ error: "--email é obrigatório" }).trim().toLowerCase().pipe(z.email("--email inválido")),
  senha: z.string({ error: "--senha é obrigatória" }).min(6, "--senha deve ter pelo menos 6 caracteres"),
  municipio: z.string({ error: IBGE_ERROR }).regex(/^\d{7}$/, IBGE_ERROR).transform(Number),
});

async function main() {
  const { values } = parseArgs({
    options: {
      nome: { type: "string" },
      email: { type: "string" },
      senha: { type: "string" },
      municipio: { type: "string" },
    },
  });

  const parsed = argsSchema.safeParse(values);
  if (!parsed.success) {
    throw new Error(`Parâmetros inválidos:\n${z.prettifyError(parsed.error)}`);
  }
  const { nome, email, senha, municipio } = parsed.data;

  const cidade = await prisma.municipios.findUnique({ where: { codigo_ibge: municipio } });
  if (!cidade) {
    throw new Error(`Município ${municipio} não encontrado. Rode o seed (npx prisma db seed) ou confira o código IBGE.`);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error(`Já existe um usuário cadastrado com o e-mail ${email}.`);
  }

  const gestor = await prisma.user.create({
    data: {
      name: nome,
      email,
      password: await hash(senha, 10),
      role: "MANAGER",
      isActive: true,
      municipioIbge: municipio,
    },
    select: { id: true, name: true, email: true },
  });

  console.log(`Gestor criado: ${gestor.name} <${gestor.email}> — Prefeitura de ${cidade.nome ?? municipio} (IBGE ${municipio}).`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
