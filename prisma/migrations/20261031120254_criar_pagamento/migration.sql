-- CreateTable
CREATE TABLE "PagamentoContaPagar" (
    "id" SERIAL NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contaPagarId" INTEGER NOT NULL,
    "contaId" INTEGER NOT NULL,

    CONSTRAINT "PagamentoContaPagar_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PagamentoContaPagar" ADD CONSTRAINT "PagamentoContaPagar_contaPagarId_fkey" FOREIGN KEY ("contaPagarId") REFERENCES "ContaPagar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoContaPagar" ADD CONSTRAINT "PagamentoContaPagar_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
