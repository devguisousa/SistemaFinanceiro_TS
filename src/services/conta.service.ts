import { executarTransacao, prisma } from "../prisma.js";
import {
  SaldoInsuficienteErro,
  calcularSaldo,
  garantirSaldoNaoNegativo,
} from "./saldo.service.js";

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
  saldoInicial: string,
) {
  try {
    return await executarTransacao(async (tx) => {
      const existe = await tx.conta.findFirst({ where: { id, usuarioId } });

      if (!existe) {
        return { erro: "CONTA NÃO ENCONTRADA" } as const;
      }

      const conta = await tx.conta.update({
        where: { id },
        data: { nome: nome.trim(), saldoInicial },
      });

      // Baixar o saldo inicial não pode deixar a conta negativa
      await garantirSaldoNaoNegativo(tx, [id]);

      return { conta };
    });
  } catch (erro) {
    if (erro instanceof SaldoInsuficienteErro) {
      return { erro: "SALDO INSUFICIENTE" } as const;
    }

    throw erro;
  }
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
  };
}
