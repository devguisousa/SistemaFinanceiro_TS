-- Saldo digitado pelo usuário na edição da conta: vira o saldo, e só as
-- transações lançadas depois (id maior que o corte) mexem nele.
-- Não apaga nada: contas existentes ficam com corte 0 (todas as transações contam)

-- AlterTable
ALTER TABLE "Conta" ADD COLUMN     "saldoDefinidoEm" TIMESTAMP(3),
ADD COLUMN     "transacaoCorteId" INTEGER NOT NULL DEFAULT 0;
