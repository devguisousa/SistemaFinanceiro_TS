/*
  Warnings:

  - A unique constraint covering the columns `[pagamentoContaPagarId]` on the table `Transacao` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Transacao" ADD COLUMN     "pagamentoContaPagarId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Transacao_pagamentoContaPagarId_key" ON "Transacao"("pagamentoContaPagarId");

-- AddForeignKey
ALTER TABLE "Transacao" ADD CONSTRAINT "Transacao_pagamentoContaPagarId_fkey" FOREIGN KEY ("pagamentoContaPagarId") REFERENCES "PagamentoContaPagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
