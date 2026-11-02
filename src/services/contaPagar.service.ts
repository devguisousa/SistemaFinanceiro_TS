import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../prisma.js";

type DadosContaPagar = {
  descricao: string;
  valorTotal: string;
  vencimento: Date;
};

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

export async function listarContaPagar(
  status?: "PENDENTE" | "PARCIALMENTE_PAGA" | "PAGA",
  pagina = 1,
  limite = 10,
) {
  const where: {
    status?: "PENDENTE" | "PARCIALMENTE_PAGA" | "PAGA";
  } = {};

  if (status) {
    where.status = status;
  }

  const skip = (pagina - 1) * limite;

  const contaPagar = await prisma.contaPagar.findMany({
    where,
    skip,
    take: limite,

    orderBy: [
      {
        criadoEm: "desc",
      },
      { id: "desc" },
    ],
  });

  const total = await prisma.contaPagar.count({
    where,
  });

  const totalPaginas = Math.ceil(total / limite);

  return { contaPagar, total, pagina, limite, totalPaginas };
}

export async function buscarContaPagar(id: number) {
  const contaPagar = await prisma.contaPagar.findUnique({
    where: { id },
  });

  if (!contaPagar) {
    return { erro: "CONTA A PAGAR NÃO EXISTE" } as const;
  }

  return { contaPagar };
}

export async function atualizarContaPagar(id: number, dados: DadosContaPagar) {
  const valorTotal = new Prisma.Decimal(dados.valorTotal);

  return prisma.$transaction(
    async (tx) => {
      const existe = await tx.contaPagar.findUnique({ where: { id } });

      if (!existe) {
        return { erro: "CONTA A PAGAR NÃO EXISTE" } as const;
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
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function deletarContaPagar(id: number) {
  const existe = await buscarContaPagar(id);

  if ("erro" in existe) {
    return existe;
  }

  const contaPagar = await prisma.contaPagar.delete({
    where: { id },
  });

  return { contaPagar };
}
