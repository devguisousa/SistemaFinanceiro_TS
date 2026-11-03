import { prisma } from "../prisma.js";
import {
  SaldoInsuficienteErro,
  garantirSaldoNaoNegativo,
} from "../utils/saldo.js";
import { executarTransacao } from "../utils/transacao.js";

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
  pagina: number;
  limite: number;
};

export const ERRO_VINCULADA =
  "TRANSAÇÃO VINCULADA A PAGAMENTO, RECEBIMENTO OU TRANSFERÊNCIA";

// Conta, categoria e tipo da categoria precisam bater com a transação
async function validarReferencias(
  tx: Parameters<Parameters<typeof executarTransacao>[0]>[0],
  dados: DadosTransacao,
) {
  const conta = await tx.conta.findUnique({ where: { id: dados.contaId } });

  if (!conta) {
    return { erro: "CONTA NÃO ENCONTRADA" } as const;
  }

  const categoria = await tx.categoria.findUnique({
    where: { id: dados.categoriaId },
  });

  if (!categoria) {
    return { erro: "CATEGORIA NÃO ENCONTRADA" } as const;
  }

  if (categoria.tipo !== dados.tipo) {
    return { erro: "CATEGORIA NÃO É DO TIPO DA TRANSAÇÃO" } as const;
  }

  return null;
}

export async function cadastrarTransacao(dados: DadosTransacao) {
  try {
    return await executarTransacao(async (tx) => {
      const invalido = await validarReferencias(tx, dados);

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
          ...(dados.data && { data: dados.data }),
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

export async function listarTransacoes(filtros: FiltrosTransacao) {
  const { tipo, contaId, categoriaId, pagina, limite } = filtros;

  const where: {
    tipo?: TipoTransacao;
    contaId?: number;
    categoriaId?: number;
  } = {};

  if (tipo) {
    where.tipo = tipo;
  }

  if (contaId !== undefined) {
    where.contaId = contaId;
  }

  if (categoriaId !== undefined) {
    where.categoriaId = categoriaId;
  }

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

export async function buscarTransacao(id: number) {
  const transacao = await prisma.transacao.findUnique({
    where: { id },
  });

  if (!transacao) {
    return { erro: "TRANSAÇÃO NÃO ENCONTRADA" } as const;
  }

  return { transacao };
}

function estaVinculada(transacao: {
  pagamentoContaPagarId: number | null;
  recebimentoId: number | null;
  transferenciaId: number | null;
}) {
  return (
    transacao.pagamentoContaPagarId !== null ||
    transacao.recebimentoId !== null ||
    transacao.transferenciaId !== null
  );
}

export async function atualizarTransacao(dados: DadosTransacao, id: number) {
  try {
    return await executarTransacao(async (tx) => {
      const existe = await tx.transacao.findUnique({ where: { id } });

      if (!existe) {
        return { erro: "TRANSAÇÃO NÃO ENCONTRADA" } as const;
      }

      if (estaVinculada(existe)) {
        return { erro: ERRO_VINCULADA } as const;
      }

      const invalido = await validarReferencias(tx, dados);

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
          ...(dados.data && { data: dados.data }),
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

export async function deletarTransacao(id: number) {
  try {
    return await executarTransacao(async (tx) => {
      const existe = await tx.transacao.findUnique({ where: { id } });

      if (!existe) {
        return { erro: "TRANSAÇÃO NÃO ENCONTRADA" } as const;
      }

      if (estaVinculada(existe)) {
        return { erro: ERRO_VINCULADA } as const;
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

export async function buscarReceitaPorId(id: number) {
  const transacao = await prisma.transacao.findFirst({
    where: { id, tipo: "RECEITA" },
  });

  if (!transacao) {
    return { erro: "RECEITA NÃO ENCONTRADA" } as const;
  }

  return { transacao };
}

export async function buscarDespesaPorId(id: number) {
  const transacao = await prisma.transacao.findFirst({
    where: { id, tipo: "DESPESA" },
  });

  if (!transacao) {
    return { erro: "DESPESA NÃO ENCONTRADA" } as const;
  }

  return { transacao };
}

export async function listarReceita(contaId: number, pagina = 1, limite = 10) {
  return listarTransacoes({ tipo: "RECEITA", contaId, pagina, limite });
}

export async function listarDespesa(contaId: number, pagina = 1, limite = 10) {
  return listarTransacoes({ tipo: "DESPESA", contaId, pagina, limite });
}
