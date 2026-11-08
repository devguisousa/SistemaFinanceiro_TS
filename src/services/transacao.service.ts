import type { Prisma, Transacao } from "../../generated/prisma/client.js";
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
  pagina: number;
  limite: number;
};

// Conta e categoria precisam existir e a categoria tem que ser do mesmo tipo
async function validarContaECategoria(
  tx: Prisma.TransactionClient,
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

// Transação gerada por pagamento, recebimento ou transferência não pode ser
// editada nem apagada direto
function estaVinculada(transacao: Transacao) {
  return (
    transacao.pagamentoContaPagarId !== null ||
    transacao.recebimentoId !== null ||
    transacao.transferenciaId !== null
  );
}

export async function cadastrarTransacao(dados: DadosTransacao) {
  try {
    return await executarTransacao(async (tx) => {
      const invalido = await validarContaECategoria(tx, dados);

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

export async function listarTransacoes(filtros: FiltrosTransacao) {
  const where: {
    tipo?: TipoTransacao;
    contaId?: number;
    categoriaId?: number;
  } = {};

  if (filtros.tipo) {
    where.tipo = filtros.tipo;
  }

  if (filtros.contaId !== undefined) {
    where.contaId = filtros.contaId;
  }

  if (filtros.categoriaId !== undefined) {
    where.categoriaId = filtros.categoriaId;
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

export async function buscarTransacao(id: number) {
  const transacao = await prisma.transacao.findUnique({
    where: { id },
  });

  if (!transacao) {
    return { erro: "TRANSAÇÃO NÃO ENCONTRADA" } as const;
  }

  return { transacao };
}

export async function atualizarTransacao(dados: DadosTransacao, id: number) {
  try {
    return await executarTransacao(async (tx) => {
      const existe = await tx.transacao.findUnique({ where: { id } });

      if (!existe) {
        return { erro: "TRANSAÇÃO NÃO ENCONTRADA" } as const;
      }

      if (estaVinculada(existe)) {
        return {
          erro: "TRANSAÇÃO VINCULADA A PAGAMENTO, RECEBIMENTO OU TRANSFERÊNCIA",
        } as const;
      }

      const invalido = await validarContaECategoria(tx, dados);

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

export async function deletarTransacao(id: number) {
  try {
    return await executarTransacao(async (tx) => {
      const existe = await tx.transacao.findUnique({ where: { id } });

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
