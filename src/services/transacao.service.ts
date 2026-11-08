import { Prisma, type Transacao } from "../../generated/prisma/client.js";
import { executarTransacao, prisma } from "../prisma.js";
import {
  SaldoInsuficienteErro,
  garantirSaldoNaoNegativo,
} from "./saldo.service.js";

type TipoTransacao = "RECEITA" | "DESPESA";

type DadosTransacao = {
  descricao: string;
  valor: string;
  tipo: TipoTransacao;
  contaId: number;
  categoriaId: number;
  data?: Date | undefined;
};

type FiltrosTransacao = {
  tipo?: TipoTransacao | undefined;
  contaId?: number | undefined;
  categoriaId?: number | undefined;
  inicio?: Date | undefined;
  fim?: Date | undefined;
  pagina: number;
  limite: number;
};

// Conta e categoria precisam existir, ser do usuário, e a categoria tem que
// ser do mesmo tipo
async function validarContaECategoria(
  tx: Prisma.TransactionClient,
  usuarioId: number,
  dados: DadosTransacao,
) {
  const conta = await tx.conta.findFirst({
    where: { id: dados.contaId, usuarioId },
  });

  if (!conta) {
    return { erro: "CONTA NÃO ENCONTRADA" } as const;
  }

  const categoria = await tx.categoria.findFirst({
    where: { id: dados.categoriaId, usuarioId },
  });

  if (!categoria) {
    return { erro: "CATEGORIA NÃO ENCONTRADA" } as const;
  }

  if (categoria.tipo !== dados.tipo) {
    return { erro: "CATEGORIA NÃO É DO TIPO DA TRANSAÇÃO" } as const;
  }

  return null;
}

// Transação gerada por pagamento, recebimento ou transferência não pode ser
// editada nem apagada direto
function estaVinculada(transacao: Transacao) {
  return (
    transacao.pagamentoContaPagarId !== null ||
    transacao.recebimentoId !== null ||
    transacao.transferenciaId !== null
  );
}

export async function cadastrarTransacao(
  usuarioId: number,
  dados: DadosTransacao,
) {
  try {
    return await executarTransacao(async (tx) => {
      const invalido = await validarContaECategoria(tx, usuarioId, dados);

      if (invalido) {
        return invalido;
      }

      const transacao = await tx.transacao.create({
        data: {
          descricao: dados.descricao.trim(),
          valor: dados.valor,
          tipo: dados.tipo,
          contaId: dados.contaId,
          categoriaId: dados.categoriaId,
          // Sem data, usa o momento atual
          data: dados.data ?? new Date(),
        },
      });

      await garantirSaldoNaoNegativo(tx, [dados.contaId]);

      return { transacao };
    });
  } catch (erro) {
    if (erro instanceof SaldoInsuficienteErro) {
      return { erro: "SALDO INSUFICIENTE" } as const;
    }

    throw erro;
  }
}

export async function listarTransacoes(
  usuarioId: number,
  filtros: FiltrosTransacao,
) {
  // A transação é do usuário dono da conta
  const where: Prisma.TransacaoWhereInput = { conta: { usuarioId } };

  if (filtros.tipo) {
    where.tipo = filtros.tipo;
  }

  if (filtros.contaId !== undefined) {
    where.contaId = filtros.contaId;
  }

  if (filtros.categoriaId !== undefined) {
    where.categoriaId = filtros.categoriaId;
  }

  if (filtros.inicio || filtros.fim) {
    const data: Prisma.DateTimeFilter<"Transacao"> = {};
    if (filtros.inicio) data.gte = filtros.inicio;
    if (filtros.fim) data.lte = filtros.fim;
    where.data = data;
  }

  const pagina = filtros.pagina;
  const limite = filtros.limite;
  const skip = (pagina - 1) * limite;

  const transacao = await prisma.transacao.findMany({
    where,
    skip,
    take: limite,
    include: {
      conta: { select: { id: true, nome: true } },
      categoria: { select: { id: true, nome: true, tipo: true } },
    },
    orderBy: [{ data: "desc" }, { id: "desc" }],
  });

  const total = await prisma.transacao.count({ where });

  const totalPaginas = Math.ceil(total / limite);

  return { transacao, total, pagina, limite, totalPaginas };
}

// Receitas e despesas do período (início e fim entram), no total e por
// categoria. Transferência só move dinheiro entre as contas do próprio
// usuário: não é receita nem despesa, então fica de fora
export async function resumirTransacoes(
  usuarioId: number,
  inicio: Date,
  fim: Date,
) {
  const grupos = await prisma.transacao.groupBy({
    by: ["categoriaId", "tipo"],
    where: {
      conta: { usuarioId },
      data: { gte: inicio, lte: fim },
      transferenciaId: null,
    },
    _sum: { valor: true },
    _count: { _all: true },
  });

  const categorias = await prisma.categoria.findMany({
    where: { id: { in: grupos.map((g) => g.categoriaId) } },
    select: { id: true, nome: true },
  });

  const nomes = new Map(categorias.map((c) => [c.id, c.nome]));

  let receitas = new Prisma.Decimal(0);
  let despesas = new Prisma.Decimal(0);
  let qtdReceitas = 0;
  let qtdDespesas = 0;

  for (const g of grupos) {
    const total = g._sum.valor ?? new Prisma.Decimal(0);

    if (g.tipo === "RECEITA") {
      receitas = receitas.plus(total);
      qtdReceitas += g._count._all;
    } else {
      despesas = despesas.plus(total);
      qtdDespesas += g._count._all;
    }
  }

  const porCategoria = grupos
    .map((g) => ({
      categoriaId: g.categoriaId,
      nome: nomes.get(g.categoriaId) ?? "",
      tipo: g.tipo,
      total: g._sum.valor ?? new Prisma.Decimal(0),
      quantidade: g._count._all,
    }))
    .sort((a, b) => b.total.comparedTo(a.total) || a.nome.localeCompare(b.nome))
    .map((c) => ({ ...c, total: c.total.toFixed(2) }));

  return {
    inicio,
    fim,
    receitas: receitas.toFixed(2),
    despesas: despesas.toFixed(2),
    resultado: receitas.minus(despesas).toFixed(2),
    qtdReceitas,
    qtdDespesas,
    porCategoria,
  };
}

export async function buscarTransacao(usuarioId: number, id: number) {
  const transacao = await prisma.transacao.findFirst({
    where: { id, conta: { usuarioId } },
  });

  if (!transacao) {
    return { erro: "TRANSAÇÃO NÃO ENCONTRADA" } as const;
  }

  return { transacao };
}

export async function atualizarTransacao(
  usuarioId: number,
  dados: DadosTransacao,
  id: number,
) {
  try {
    return await executarTransacao(async (tx) => {
      const existe = await tx.transacao.findFirst({
        where: { id, conta: { usuarioId } },
      });

      if (!existe) {
        return { erro: "TRANSAÇÃO NÃO ENCONTRADA" } as const;
      }

      if (estaVinculada(existe)) {
        return {
          erro: "TRANSAÇÃO VINCULADA A PAGAMENTO, RECEBIMENTO OU TRANSFERÊNCIA",
        } as const;
      }

      const invalido = await validarContaECategoria(tx, usuarioId, dados);

      if (invalido) {
        return invalido;
      }

      const transacao = await tx.transacao.update({
        where: { id },
        data: {
          descricao: dados.descricao.trim(),
          valor: dados.valor,
          tipo: dados.tipo,
          contaId: dados.contaId,
          categoriaId: dados.categoriaId,
          // Sem data, mantém a que já estava
          data: dados.data ?? existe.data,
        },
      });

      // A conta antiga (se mudou) e a nova não podem ficar negativas
      await garantirSaldoNaoNegativo(tx, [existe.contaId, dados.contaId]);

      return { transacao };
    });
  } catch (erro) {
    if (erro instanceof SaldoInsuficienteErro) {
      return { erro: "SALDO INSUFICIENTE" } as const;
    }

    throw erro;
  }
}

export async function deletarTransacao(usuarioId: number, id: number) {
  try {
    return await executarTransacao(async (tx) => {
      const existe = await tx.transacao.findFirst({
        where: { id, conta: { usuarioId } },
      });

      if (!existe) {
        return { erro: "TRANSAÇÃO NÃO ENCONTRADA" } as const;
      }

      if (estaVinculada(existe)) {
        return {
          erro: "TRANSAÇÃO VINCULADA A PAGAMENTO, RECEBIMENTO OU TRANSFERÊNCIA",
        } as const;
      }

      const transacao = await tx.transacao.delete({ where: { id } });

      // Apagar uma receita não pode deixar a conta negativa
      await garantirSaldoNaoNegativo(tx, [existe.contaId]);

      return { transacao };
    });
  } catch (erro) {
    if (erro instanceof SaldoInsuficienteErro) {
      return { erro: "SALDO INSUFICIENTE" } as const;
    }

    throw erro;
  }
}

export async function buscarReceitaPorId(usuarioId: number, id: number) {
  const transacao = await prisma.transacao.findFirst({
    where: { id, tipo: "RECEITA", conta: { usuarioId } },
  });

  if (!transacao) {
    return { erro: "RECEITA NÃO ENCONTRADA" } as const;
  }

  return { transacao };
}

export async function buscarDespesaPorId(usuarioId: number, id: number) {
  const transacao = await prisma.transacao.findFirst({
    where: { id, tipo: "DESPESA", conta: { usuarioId } },
  });

  if (!transacao) {
    return { erro: "DESPESA NÃO ENCONTRADA" } as const;
  }

  return { transacao };
}

export async function listarReceita(
  usuarioId: number,
  contaId: number,
  pagina = 1,
  limite = 10,
) {
  return listarTransacoes(usuarioId, {
    tipo: "RECEITA",
    contaId,
    pagina,
    limite,
  });
}

export async function listarDespesa(
  usuarioId: number,
  contaId: number,
  pagina = 1,
  limite = 10,
) {
  return listarTransacoes(usuarioId, {
    tipo: "DESPESA",
    contaId,
    pagina,
    limite,
  });
}
