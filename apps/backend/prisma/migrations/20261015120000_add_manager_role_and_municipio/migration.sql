-- AlterEnum
-- O valor MANAGER já existia no banco de produção (criado fora das
-- migrations); o IF NOT EXISTS mantém esta migration segura lá e cria o valor
-- em bancos novos.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MANAGER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "municipioIbge" INTEGER;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_municipioIbge_fkey" FOREIGN KEY ("municipioIbge") REFERENCES "Municipios"("codigo_ibge") ON DELETE SET NULL ON UPDATE CASCADE;
