-- CreateEnum
CREATE TYPE "StatusContaPagar" AS ENUM ('PENDENTE', 'PARCIALMENTE_PAGA', 'PAGA');

-- CreateTable
CREATE TABLE "ContaPagar" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "valorPago" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" "StatusContaPagar" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContaPagar_pkey" PRIMARY KEY ("id")
);
