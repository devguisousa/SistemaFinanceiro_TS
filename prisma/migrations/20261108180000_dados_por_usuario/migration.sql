-- Cada usuário passa a ter os próprios dados financeiros.
-- Decisão do dono do projeto (2026-11-08): apagar todos os dados do banco
-- compartilhado. Usuários e senhas continuam.
TRUNCATE TABLE
  "Transacao",
  "Transferencia",
  "PagamentoContaPagar",
  "RecebimentoContaReceber",
  "ContaPagar",
  "ContaReceber",
  "Categoria",
  "Conta"
RESTART IDENTITY;

-- DropIndex
DROP INDEX "Categoria_nome_key";

-- AlterTable
ALTER TABLE "Conta" ADD COLUMN "usuarioId" INTEGER NOT NULL;
ALTER TABLE "Categoria" ADD COLUMN "usuarioId" INTEGER NOT NULL;
ALTER TABLE "ContaPagar" ADD COLUMN "usuarioId" INTEGER NOT NULL;
ALTER TABLE "ContaReceber" ADD COLUMN "usuarioId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "Conta_usuarioId_idx" ON "Conta"("usuarioId");
CREATE UNIQUE INDEX "Categoria_usuarioId_nome_key" ON "Categoria"("usuarioId", "nome");
CREATE INDEX "ContaPagar_usuarioId_idx" ON "ContaPagar"("usuarioId");
CREATE INDEX "ContaReceber_usuarioId_idx" ON "ContaReceber"("usuarioId");

-- AddForeignKey
ALTER TABLE "Conta" ADD CONSTRAINT "Conta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContaPagar" ADD CONSTRAINT "ContaPagar_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContaReceber" ADD CONSTRAINT "ContaReceber_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
