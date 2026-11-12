import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/generated/prisma/client";
import { env } from "../env";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  min: 2,
  max: 10,
  idleTimeoutMillis: 60_000,
  keepAlive: true,
});
const prisma = new PrismaClient({ adapter });

// Mantém o pool aquecido para evitar latência de ~1s na abertura de conexão TLS com o banco remoto após ociosidade.
void prisma.$queryRaw`SELECT 1`.catch(() => undefined);
setInterval(() => {
  void prisma.$queryRaw`SELECT 1`.catch(() => undefined);
}, 45_000).unref();

export { prisma };
