import { prisma } from "../prisma.js";

type dados = {
  descricao: string;
  valorTotal: string;
  vencimento: Date;
};

export async function cadastrarContaReceber(dados: dados) {
  const contaReceber = await prisma.contaReceber.create({
    data: {
      descricao: dados.descricao,
      valorTotal: dados.valorTotal,
      vencimento: dados.vencimento,
    },
  });

  return { contaReceber };
}

export async function listarContaReceber(
  pagina = 1,
  limite = 10,
) {
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

export async function atualizarContaReceber(id: number, dados: dados) {
  const existe = await buscarContaReceber(id);

  if ("erro" in existe) {
    return existe;
  }

  const contaReceber = await prisma.contaReceber.update({
    where: { id },
    data: {
      descricao: dados.descricao,
      valorTotal: dados.valorTotal,
      vencimento: dados.vencimento,
    },
  });

  return { contaReceber };
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
