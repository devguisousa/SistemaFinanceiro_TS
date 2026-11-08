import { Prisma } from "../../generated/prisma/client.js";

// Lançado dentro de uma transação para desfazer tudo (rollback)
export class SaldoInsuficienteErro extends Error {}

export async function calcularSaldo(
  tx: Prisma.TransactionClient,
  contaId: number,
) {
  const conta = await tx.conta.findUnique({ where: { id: contaId } });

  if (!conta) {
    return null;
  }

  const receitas = await tx.transacao.aggregate({
    where: { contaId, tipo: "RECEITA" },
    _sum: { valor: true },
  });

  const despesas = await tx.transacao.aggregate({
    where: { contaId, tipo: "DESPESA" },
    _sum: { valor: true },
  });

  const totalReceitas = receitas._sum.valor ?? new Prisma.Decimal(0);
  const totalDespesas = despesas._sum.valor ?? new Prisma.Decimal(0);

  const saldoAtual = conta.saldoInicial.plus(totalReceitas).minus(totalDespesas);

  return { conta, totalReceitas, totalDespesas, saldoAtual };
}

// Chamar depois de gravar: se alguma conta ficou negativa, desfaz a transação
export async function garantirSaldoNaoNegativo(
  tx: Prisma.TransactionClient,
  contaIds: number[],
) {
  for (const contaId of new Set(contaIds)) {
    const saldo = await calcularSaldo(tx, contaId);

    if (saldo && saldo.saldoAtual.lt(0)) {
      throw new SaldoInsuficienteErro(`Saldo insuficiente na conta ${contaId}`);
    }
  }
}
