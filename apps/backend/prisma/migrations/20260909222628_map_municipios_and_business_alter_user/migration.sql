/*
  Warnings:

  - A unique constraint covering the columns `[cnpj]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "name_businss" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "url_cartao_cnpj" TEXT NOT NULL,
    "url_contrato_social" TEXT NOT NULL,
    "url_comprovante_endereco" TEXT NOT NULL,
    "url_comprovante_socio" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Municipios" (
    "id" TEXT NOT NULL,
    "nome" TEXT,
    "codigo_ibge" INTEGER NOT NULL,
    "codigo_tce" INTEGER,

    CONSTRAINT "Municipios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Business_cnpj_key" ON "Business"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Municipios_codigo_ibge_key" ON "Municipios"("codigo_ibge");

-- CreateIndex
CREATE UNIQUE INDEX "Municipios_codigo_tce_key" ON "Municipios"("codigo_tce");

-- CreateIndex
CREATE UNIQUE INDEX "User_cnpj_key" ON "User"("cnpj");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_cnpj_fkey" FOREIGN KEY ("cnpj") REFERENCES "Business"("cnpj") ON DELETE SET NULL ON UPDATE CASCADE;
