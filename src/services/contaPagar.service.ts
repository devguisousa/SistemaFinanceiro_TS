import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../prisma.js";
import { executarTransacao } from "../utils/transacao.js";

type StatusContaPagar = "PENDENTE" | "PARCIALMENTE_PAGA" | "PAGA";

type DadosContaPagar = {
  descricao: string;
  valorTotal: string;
  vencimento: Date;
};

type FiltrosContaPagar = {
  status?: StatusContaPagar | undefined;
  vencidas?: boolean | undefined;
  pagina?: number | undefined;
  limite?: number | undefined;
};

function inicioDeHoje() {
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  return hoje;
}

export async function cadastrarContaPagar(dados: DadosContaPagar) {
  const contaPagar = await prisma.contaPagar.create({
    data: {
      descricao: dados.descricao.trim(),
      valorTotal: dados.valorTotal,
      vencimento: dados.vencimento,
    },
  });

  return { contaPagar };
}

export async function listarContaPagar(filtros: FiltrosContaPagar = {}) {
  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 10;

  const where: Prisma.ContaPagarWhereInput = {};

  if (filtros.status) {
    where.status = filtros.status;
  }

  // Vencida = vencimento antes de hoje e ainda não paga
  if (filtros.vencidas === true) {
    where.vencimento = { lt: inicioDeHoje() };
    where.status = filtros.status ?? { not: "PAGA" };
  }

  if (filtros.vencidas === false) {
    where.OR = [{ vencimento: { gte: inicioDeHoje() } }, { status: "PAGA" }];
  }

  const skip = (pagina - 1) * limite;

  const contaPagar = await prisma.contaPagar.findMany({
    where,
    skip,
    take: limite,
    orderBy: [{ criadoEm: "desc" }, { id: "desc" }],
  });

  const total = await prisma.contaPagar.count({ where });

  const totalPaginas = Math.ceil(total / limite);

  return { contaPagar, total, pagina, limite, totalPaginas };
}

export async function buscarContaPagar(id: number) {
  const contaPagar = await prisma.contaPagar.findUnique({
    where: { id },
  });

  if (!contaPagar) {
    return { erro: "CONTA A PAGAR NÃO ENCONTRADA" } as const;
  }

  return { contaPagar };
}

export async function atualizarContaPagar(id: number, dados: DadosContaPagar) {
  const valorTotal = new Prisma.Decimal(dados.valorTotal);

  return executarTransacao(async (tx) => {
    const existe = await tx.contaPagar.findUnique({ where: { id } });

    if (!existe) {
      return { erro: "CONTA A PAGAR NÃO ENCONTRADA" } as const;
    }

    // O total não pode ficar abaixo do que já foi pago
    if (valorTotal.lt(existe.valorPago)) {
      return { erro: "VALOR TOTAL MENOR QUE O JÁ PAGO" } as const;
    }

    const status = existe.valorPago.lte(0)
      ? "PENDENTE"
      : existe.valorPago.eq(valorTotal)
        ? "PAGA"
        : "PARCIALMENTE_PAGA";

    const contaPagar = await tx.contaPagar.update({
      where: { id },
      data: {
        descricao: dados.descricao.trim(),
        valorTotal,
        vencimento: dados.vencimento,
        status,
      },
    });

    return { contaPagar };
  });
}

export async function deletarContaPagar(id: number) {
  const existe = await buscarContaPagar(id);

  if ("erro" in existe) {
    return existe;
  }

  const pagamentos = await prisma.pagamentoContaPagar.count({
    where: { contaPagarId: id },
  });

  if (pagamentos > 0) {
    return { erro: "CONTA A PAGAR POSSUI PAGAMENTOS" } as const;
  }

  const contaPagar = await prisma.contaPagar.delete({
    where: { id },
  });

  return { contaPagar };
}
