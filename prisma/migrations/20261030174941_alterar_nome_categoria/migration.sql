/*
  Warnings:

  - You are about to drop the column `descricao` on the `Categoria` table. All the data in the column will be lost.
  - Added the required column `nome` to the `Categoria` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Categoria" DROP COLUMN "descricao",
ADD COLUMN     "nome" TEXT NOT NULL;
