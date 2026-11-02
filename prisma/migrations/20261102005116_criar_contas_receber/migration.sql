/*
  Warnings:

  - A unique constraint covering the columns `[recebimentoId]` on the table `Transacao` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "StatusContaReceber" AS ENUM ('PENDENTE', 'PARCIALMENTE_RECEBIDA', 'RECEBIDA');

-- AlterTable
ALTER TABLE "Transacao" ADD COLUMN     "recebimentoId" INTEGER;

-- CreateTable
CREATE TABLE "ContaReceber" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "valorRecebido" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" "StatusContaReceber" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContaReceber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecebimentoContaReceber" (
    "id" SERIAL NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contaReceberId" INTEGER NOT NULL,
    "contaId" INTEGER NOT NULL,

    CONSTRAINT "RecebimentoContaReceber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transacao_recebimentoId_key" ON "Transacao"("recebimentoId");

-- AddForeignKey
ALTER TABLE "Transacao" ADD CONSTRAINT "Transacao_recebimentoId_fkey" FOREIGN KEY ("recebimentoId") REFERENCES "RecebimentoContaReceber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecebimentoContaReceber" ADD CONSTRAINT "RecebimentoContaReceber_contaReceberId_fkey" FOREIGN KEY ("contaReceberId") REFERENCES "ContaReceber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecebimentoContaReceber" ADD CONSTRAINT "RecebimentoContaReceber_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
