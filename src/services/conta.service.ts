import { Prisma } from "../../generated/prisma/client.js";
import { executarTransacao, prisma } from "../prisma.js";
import { calcularSaldo } from "./saldo.service.js";

export async function cadastrarConta(
  usuarioId: number,
  nome: string,
  saldoInicial: string,
) {
  const conta = await prisma.conta.create({
    data: {
      nome: nome.trim(),
      saldoInicial,
      usuarioId,
    },
  });

  return conta;
}

export async function listarContas(usuarioId: number, pagina = 1, limite = 10) {
  const skip = (pagina - 1) * limite;

  const where = { usuarioId };

  const contas = await prisma.conta.findMany({
    where,
    skip,
    take: limite,
    orderBy: { id: "asc" },
  });

  const total = await prisma.conta.count({ where });

  const totalPaginas = Math.ceil(total / limite);

  return { contas, total, pagina, limite, totalPaginas };
}

// Só acha a conta se ela for do usuário
export async function buscarContas(usuarioId: number, id: number) {
  const conta = await prisma.conta.findFirst({
    where: { id, usuarioId },
  });

  return conta;
}

export async function atualizarConta(
  usuarioId: number,
  id: number,
  nome: string,
  saldoAtual?: string,
) {
  return executarTransacao(async (tx) => {
    const existe = await tx.conta.findFirst({ where: { id, usuarioId } });

    if (!existe) {
      return { erro: "CONTA NÃO ENCONTRADA" } as const;
    }

    const data: Prisma.ContaUpdateInput = { nome: nome.trim() };

    // Saldo digitado diferente do atual: ele vira o saldo da conta. As
    // transações que já existem deixam de contar; só as lançadas depois
    // (id maior que o corte) continuam mexendo no saldo
    if (saldoAtual !== undefined) {
      const saldo = await calcularSaldo(tx, id);

      if (saldo && !saldo.saldoAtual.eq(saldoAtual)) {
        const ultima = await tx.transacao.aggregate({ _max: { id: true } });

        data.saldoInicial = saldoAtual;
        data.saldoDefinidoEm = new Date();
        data.transacaoCorteId = ultima._max.id ?? 0;
      }
    }

    const conta = await tx.conta.update({ where: { id }, data });

    return { conta };
  });
}

export async function deletarConta(usuarioId: number, id: number) {
  const conta = await buscarContas(usuarioId, id);

  if (!conta) {
    return { erro: "CONTA NÃO ENCONTRADA" } as const;
  }

  const transacoes = await prisma.transacao.count({ where: { contaId: id } });

  const transferencias = await prisma.transferencia.count({
    where: { OR: [{ contaOrigemId: id }, { contaDestinoId: id }] },
  });

  if (transacoes > 0 || transferencias > 0) {
    return { erro: "CONTA POSSUI MOVIMENTAÇÕES" } as const;
  }

  await prisma.conta.delete({ where: { id } });

  return { conta };
}

export async function buscarSaldoAtual(usuarioId: number, id: number) {
  const conta = await buscarContas(usuarioId, id);

  if (!conta) {
    return null;
  }

  const saldo = await calcularSaldo(prisma, id);

  if (!saldo) {
    return null;
  }

  return {
    contaId: saldo.conta.id,
    saldoInicial: saldo.conta.saldoInicial.toFixed(2),
    totalReceitas: saldo.totalReceitas.toFixed(2),
    totalDespesas: saldo.totalDespesas.toFixed(2),
    saldoAtual: saldo.saldoAtual.toFixed(2),
    // Preenchido quando o usuário digitou o saldo (receitas e despesas
    // acima contam só o que foi lançado depois disso)
    saldoDefinidoEm: saldo.conta.saldoDefinidoEm,
  };
}
