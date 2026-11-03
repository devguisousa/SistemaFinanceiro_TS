import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../prisma.js";
import { executarTransacao } from "../utils/transacao.js";

type StatusContaReceber = "PENDENTE" | "PARCIALMENTE_RECEBIDA" | "RECEBIDA";

type DadosContaReceber = {
  descricao: string;
  valorTotal: string;
  vencimento: Date;
};

type FiltrosContaReceber = {
  status?: StatusContaReceber | undefined;
  vencidas?: boolean | undefined;
  pagina?: number | undefined;
  limite?: number | undefined;
};

function inicioDeHoje() {
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  return hoje;
}

export async function cadastrarContaReceber(dados: DadosContaReceber) {
  const contaReceber = await prisma.contaReceber.create({
    data: {
      descricao: dados.descricao.trim(),
      valorTotal: dados.valorTotal,
      vencimento: dados.vencimento,
    },
  });

  return { contaReceber };
}

export async function listarContaReceber(filtros: FiltrosContaReceber = {}) {
  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 10;

  const where: Prisma.ContaReceberWhereInput = {};

  if (filtros.status) {
    where.status = filtros.status;
  }

  // Vencida = vencimento antes de hoje e ainda não recebida
  if (filtros.vencidas === true) {
    where.vencimento = { lt: inicioDeHoje() };
    where.status = filtros.status ?? { not: "RECEBIDA" };
  }

  if (filtros.vencidas === false) {
    where.OR = [
      { vencimento: { gte: inicioDeHoje() } },
      { status: "RECEBIDA" },
    ];
  }

  const skip = (pagina - 1) * limite;

  const contaReceber = await prisma.contaReceber.findMany({
    where,
    skip,
    take: limite,
    orderBy: [{ criadoEm: "desc" }, { id: "desc" }],
  });

  const total = await prisma.contaReceber.count({ where });

  const totalPagina = Math.ceil(total / limite);

  return { contaReceber, pagina, limite, total, totalPagina };
}

export async function buscarContaReceber(id: number) {
  const contaReceber = await prisma.contaReceber.findUnique({
    where: { id },
  });

  if (!contaReceber) {
    return { erro: "CONTA A RECEBER NÃO ENCONTRADA" } as const;
  }

  return { contaReceber };
}

export async function atualizarContaReceber(
  id: number,
  dados: DadosContaReceber,
) {
  const valorTotal = new Prisma.Decimal(dados.valorTotal);

  return executarTransacao(async (tx) => {
    const existe = await tx.contaReceber.findUnique({ where: { id } });

    if (!existe) {
      return { erro: "CONTA A RECEBER NÃO ENCONTRADA" } as const;
    }

    // O total não pode ficar abaixo do que já foi recebido
    if (valorTotal.lt(existe.valorRecebido)) {
      return { erro: "VALOR TOTAL MENOR QUE O JÁ RECEBIDO" } as const;
    }

    const status = existe.valorRecebido.lte(0)
      ? "PENDENTE"
      : existe.valorRecebido.eq(valorTotal)
        ? "RECEBIDA"
        : "PARCIALMENTE_RECEBIDA";

    const contaReceber = await tx.contaReceber.update({
      where: { id },
      data: {
        descricao: dados.descricao.trim(),
        valorTotal,
        vencimento: dados.vencimento,
        status,
      },
    });

    return { contaReceber };
  });
}

export async function deletarContaReceber(id: number) {
  const existe = await buscarContaReceber(id);

  if ("erro" in existe) {
    return existe;
  }

  const recebimentos = await prisma.recebimentoContaReceber.count({
    where: { contaReceberId: id },
  });

  if (recebimentos > 0) {
    return { erro: "CONTA A RECEBER POSSUI RECEBIMENTOS" } as const;
  }

  const contaReceber = await prisma.contaReceber.delete({
    where: { id },
  });

  return { contaReceber };
}
