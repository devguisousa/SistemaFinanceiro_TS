import { prisma } from "../prisma.js";
import {
  buscarTotalDespesas,
  buscarTotalReceitas,
} from "./transacao.service.js";

export async function cadastrarConta(nome: string, saldoInicial: string) {
  const conta = await prisma.conta.create({
    data: {
      nome: nome.trim(),
      saldoInicial: saldoInicial,
    },
  });

  return conta;
}

export async function listarContas(pagina = 1, limite = 10) {
  const skip = (pagina - 1) * limite;

  const contas = await prisma.conta.findMany({
    skip,
    take: limite,

    orderBy: {
      id: "asc",
    },
  });

  const total = await prisma.conta.count();

  const totalPaginas = Math.ceil(total / limite);

  return { contas, total, pagina, limite, totalPaginas };
}

export async function buscarContas(id: number) {
  const existe = await prisma.conta.findUnique({
    where: { id },
  });

  if (!existe) {
    return null;
  }

  return existe;
}

export async function atualizarConta(
  id: number,
  nome: string,
  saldoInicial: string,
) {
  const existe = await buscarContas(id);

  if (!existe) {
    return null;
  }

  const contaAtualizada = await prisma.conta.update({
    where: { id: id },

    data: { nome: nome.trim(), saldoInicial: saldoInicial },
  });

  return contaAtualizada;
}

export async function deletarConta(id: number) {
  const existe = await buscarContas(id);

  if (!existe) {
    return null;
  }

  const excluido = await prisma.conta.delete({
    where: { id },
  });

  return excluido;
}

export async function buscarSaldoAtual(id: number) {
  const conta = await buscarContas(id);

  if (!conta) {
    return null;
  }

  const [receitas, despesas] = await Promise.all([
    buscarTotalReceitas(id),
    buscarTotalDespesas(id),
  ]);

  const saldoAtual = conta.saldoInicial.plus(receitas).minus(despesas);

  return {
    contaId: conta.id,
    saldoInicial: conta.saldoInicial.toFixed(2),
    totalReceitas: receitas.toFixed(2),
    totalDespesas: despesas.toFixed(2),
    saldoAtual: saldoAtual.toFixed(2),
  };
}
