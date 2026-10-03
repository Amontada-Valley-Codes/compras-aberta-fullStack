/*
  Warnings:

  - Added the required column `porte_empresa` to the `Business` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PorteEmpresa" AS ENUM ('MEI', 'ME', 'EPP');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "porte_empresa" "PorteEmpresa" NOT NULL;
