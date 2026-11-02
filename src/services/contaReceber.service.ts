import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../prisma.js";

type DadosContaReceber = {
  descricao: string;
  valorTotal: string;
  vencimento: Date;
};

export async function cadastrarContaReceber(dados: DadosContaReceber) {
  const contaReceber = await prisma.contaReceber.create({
    data: {
      descricao: dados.descricao,
      valorTotal: dados.valorTotal,
      vencimento: dados.vencimento,
    },
  });

  return { contaReceber };
}

export async function listarContaReceber(pagina = 1, limite = 10) {
  const skip = (pagina - 1) * limite;

  const contaReceber = await prisma.contaReceber.findMany({
    skip,
    take: limite,
    orderBy: [{ criadoEm: "desc" }, { id: "asc" }],
  });

  const total = await prisma.contaReceber.count();

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

  return prisma.$transaction(
    async (tx) => {
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
          descricao: dados.descricao,
          valorTotal,
          vencimento: dados.vencimento,
          status,
        },
      });

      return { contaReceber };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function deletarContaReceber(id: number) {
  const existe = await buscarContaReceber(id);

  if ("erro" in existe) {
    return existe;
  }

  const contaReceber = await prisma.contaReceber.delete({
    where: { id },
  });
  return { contaReceber };
}
