import { prisma } from "../prisma.js";

type dados = {
  descricao: string;
  valorTotal: string;
  vencimento: Date;
};

export async function cadastrarContaPagar(dados: dados) {
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

  return {contaPagar};
}

export async function atualizarContaPagar(id: number, dados: dados) {
  const existe = await buscarContaPagar(id);

  if ("erro" in existe) {
    return existe;
  }

  const contaPagar = await prisma.contaPagar.update({
    where: { id },
    data: {
      descricao: dados.descricao.trim(),
      valorTotal: dados.valorTotal,
      vencimento: dados.vencimento,
    },
  });

  return { contaPagar };
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
