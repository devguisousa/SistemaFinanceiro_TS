/*
  Warnings:

  - The `papel` column on the `Usuario` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('USUARIO', 'ADMIN');

-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "papel",
ADD COLUMN     "papel" "Papel" NOT NULL DEFAULT 'USUARIO';
