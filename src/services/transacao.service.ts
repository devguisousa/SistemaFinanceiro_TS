import { number } from "zod";
import { prisma } from "../prisma.js";

type dadosTransacao = {
  descricao: string;
  valor: string;
  tipo: "RECEITA" | "DESPESA";
  contaId: number;
  categoriaId: number;
};

type FiltrosTransacao = {
  tipo?: "RECEITA" | "DESPESA";
  contaId?: number;
  categoriaId?: number;
  pagina: number;
  limite: number;
};

export async function cadastrarTransacao(dados: dadosTransacao) {
  const conta = await prisma.conta.findUnique({
    where: { id: dados.contaId },
  });

  if (!conta) {
    return { erro: "CONTA NÃO ENCONTRADA" } as const;
  }

  const categoria = await prisma.categoria.findUnique({
    where: {
      id: dados.categoriaId,
    },
  });

  if (!categoria) {
    return { erro: "CATEGORIA NÃO ENCONTRADA" } as const;
  }

  const transacao = await prisma.transacao.create({
    data: {
      descricao: dados.descricao.trim(),
      valor: dados.valor,
      tipo: dados.tipo,
      contaId: dados.contaId,
      categoriaId: dados.categoriaId,
    },
  });

  return { transacao };
}

export async function listarTransacoes(tipo?: "RECEITA" | "DESPESA", contaId? : number, pagina = 1, limite = 10) {

const where: {
      tipo?: "RECEITA" | "DESPESA";
      contaId?: number;
    } = {};
if(tipo) {
  where.tipo = tipo;
}

if(contaId !== undefined) {
  where.contaId = contaId;
}

const skip = (pagina - 1) * 3



  const transacao = await prisma.transacao.findMany({
    where,

    skip: skip,
    take: limite,
    include: {
      conta: true,
      categoria: true,
    },
    orderBy: {
      data: "desc",
    },
  });

  const total = await prisma.transacao.count({
    where,
  })

  const totalPaginas = Math.ceil(total/limite)

  return { transacao, total, pagina, limite, totalPaginas };
}

export async function buscarTransacao(id: number) {
  const transacao = await prisma.transacao.findUnique({
    where: {
      id: id,
    },
  });

  if (!transacao) {
    return { erro: "TRANSACÃO NÃO ENCONTRADO" } as const;
  }

  return { transacao };
}

export async function atualizarTransacao(dados: dadosTransacao, id: number) {
  const existe = await buscarTransacao(id);
  if ("erro" in existe) {
    return existe;
  }

  const conta = await prisma.conta.findUnique({
    where: { id: dados.contaId },
  });

  if (!conta) {
    return { erro: "CONTA NÃO ENCONTRADA" } as const;
  }

  const categoria = await prisma.categoria.findUnique({
    where: { id: dados.categoriaId },
  });

  if (!categoria) {
    return { erro: "CATEGORIA NÃO ENCONTRADA" } as const;
  }

  const transacao = await prisma.transacao.update({
    where: {
      id: id,
    },
    data: {
      descricao: dados.descricao.trim(),
      valor: dados.valor,
      tipo: dados.tipo,
      contaId: dados.contaId,
      categoriaId: dados.categoriaId,
    },
  });

  return { transacao };
}

export async function deletarTransacao(id: number) {
  const existe = await buscarTransacao(id);

  if ("erro" in existe) {
    return existe;
  }

  const transacao = await prisma.transacao.delete({
    where: {
      id: id,
    },
  });

  return { transacao };
}

export async function buscarTotalReceitas(contaId: number) {
  const receitas = await prisma.transacao.aggregate({
    where: {
      contaId: contaId,
      tipo: "RECEITA",
    },
    _sum: {
      valor: true,
    },
  });

  return receitas._sum.valor ?? 0;
}

export async function buscarTotalDespesas(contaId: number) {
  const despesa = await prisma.transacao.aggregate({
    where: {
      contaId: contaId,
      tipo: "DESPESA",
    },
    _sum: {
      valor: true,
    },
  });

  return despesa._sum.valor ?? 0;
}

export async function buscarReceitaPorId(id: number) {
  const transacao = await prisma.transacao.findFirst({
    where: {
      id: id,
      tipo: "RECEITA",
    },
  });

  if (!transacao) {
    return { erro: "RECEITA NÃO ENCONTRADA" } as const;
  }

  return { transacao };
}

export async function buscarDespesaPorId(id: number) {
  const transacao = await prisma.transacao.findFirst({
    where: {
      id: id,
      tipo: "DESPESA",
    },
  });

  if (!transacao) {
    return { erro: "DESPESA NÃO ENCONTRADA" } as const;
  }

  return { transacao };
}


export async function listarReceita(contaId: number, pagina = 1, limite = 10) {
  return listarTransacoes("RECEITA", contaId, pagina, limite)
}

export async function listarDespesa(
  contaId: number,
  pagina = 1,
  limite = 10
) {
  return listarTransacoes("DESPESA", contaId, pagina, limite);
}
