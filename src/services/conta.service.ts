import { executarTransacao, prisma } from "../prisma.js";
import {
  SaldoInsuficienteErro,
  calcularSaldo,
  garantirSaldoNaoNegativo,
} from "./saldo.service.js";

export async function cadastrarConta(nome: string, saldoInicial: string) {
  const conta = await prisma.conta.create({
    data: {
      nome: nome.trim(),
      saldoInicial,
    },
  });

  return conta;
}

export async function listarContas(pagina = 1, limite = 10) {
  const skip = (pagina - 1) * limite;

  const contas = await prisma.conta.findMany({
    skip,
    take: limite,
    orderBy: { id: "asc" },
  });

  const total = await prisma.conta.count();

  const totalPaginas = Math.ceil(total / limite);

  return { contas, total, pagina, limite, totalPaginas };
}

export async function buscarContas(id: number) {
  const conta = await prisma.conta.findUnique({
    where: { id },
  });

  return conta;
}

export async function atualizarConta(
  id: number,
  nome: string,
  saldoInicial: string,
) {
  try {
    return await executarTransacao(async (tx) => {
      const existe = await tx.conta.findUnique({ where: { id } });

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

export async function deletarConta(id: number) {
  const conta = await buscarContas(id);

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

export async function buscarSaldoAtual(id: number) {
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
