import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../prisma.js";
import { executarTransacao } from "../utils/transacao.js";
import { buscarContaReceber } from "./contaReceber.service.js";

type DadosRecebimento = {
  contaReceberId: number;
  contaId: number;
  categoriaId: number;
  valor: string;
};

export async function cadastrarRecebimento(dados: DadosRecebimento) {
  const valor = new Prisma.Decimal(dados.valor);

  if (valor.lte(0)) {
    return { erro: "VALOR DEVE SER MAIOR QUE ZERO" } as const;
  }

  return executarTransacao(async (tx) => {
    const contaReceber = await tx.contaReceber.findUnique({
      where: { id: dados.contaReceberId },
    });

    if (!contaReceber) {
      return { erro: "CONTA A RECEBER NÃO ENCONTRADA" } as const;
    }

    const conta = await tx.conta.findUnique({
      where: { id: dados.contaId },
    });

    if (!conta) {
      return { erro: "CONTA BANCÁRIA NÃO ENCONTRADA" } as const;
    }

    const categoria = await tx.categoria.findUnique({
      where: { id: dados.categoriaId },
    });

    if (!categoria) {
      return { erro: "CATEGORIA NÃO ENCONTRADA" } as const;
    }

    if (categoria.tipo !== "RECEITA") {
      return { erro: "CATEGORIA NÃO É DO TIPO RECEITA" } as const;
    }

    const saldoPendente = contaReceber.valorTotal.minus(
      contaReceber.valorRecebido,
    );

    if (saldoPendente.lte(0)) {
      return { erro: "CONTA JÁ RECEBIDA" } as const;
    }

    if (valor.gt(saldoPendente)) {
      return { erro: "RECEBIMENTO MAIOR QUE O SALDO PENDENTE" } as const;
    }

    const novoValorRecebido = contaReceber.valorRecebido.plus(valor);

    const novoStatus = novoValorRecebido.eq(contaReceber.valorTotal)
      ? "RECEBIDA"
      : "PARCIALMENTE_RECEBIDA";

    const recebimento = await tx.recebimentoContaReceber.create({
      data: {
        valor,
        contaReceberId: dados.contaReceberId,
        contaId: dados.contaId,
      },
    });

    const transacao = await tx.transacao.create({
      data: {
        descricao: `Recebimento: ${contaReceber.descricao}`.slice(0, 200),
        valor,
        tipo: "RECEITA",
        contaId: dados.contaId,
        categoriaId: dados.categoriaId,
        recebimentoId: recebimento.id,
      },
    });

    const contaAtualizada = await tx.contaReceber.update({
      where: { id: dados.contaReceberId },
      data: {
        valorRecebido: novoValorRecebido,
        status: novoStatus,
      },
    });

    return {
      recebimento,
      transacao,
      contaReceber: contaAtualizada,
    };
  });
}

export async function listarRecebimentos(pagina = 1, limite = 10) {
  const skip = (pagina - 1) * limite;

  const recebimentos = await prisma.recebimentoContaReceber.findMany({
    skip,
    take: limite,
    orderBy: [{ data: "desc" }, { id: "desc" }],
  });

  const total = await prisma.recebimentoContaReceber.count();

  const totalPagina = Math.ceil(total / limite);

  return {
    recebimentos,
    pagina,
    limite,
    total,
    totalPagina,
  };
}

export async function buscarRecebimento(id: number) {
  const recebimento = await prisma.recebimentoContaReceber.findUnique({
    where: { id },
  });

  if (!recebimento) {
    return { erro: "RECEBIMENTO NÃO ENCONTRADO" } as const;
  }

  return { recebimento };
}

export async function listarRecebimentosPorContaReceber(
  id: number,
  pagina = 1,
  limite = 10,
) {
  // 1. Verificar se a conta a receber existe
  const contaReceber = await buscarContaReceber(id);

  if ("erro" in contaReceber) {
    return { erro: contaReceber.erro };
  }

  // 2. Calcular paginação
  const skip = (pagina - 1) * limite;

  // 3. Filtrar pelo ID da conta a receber
  const where = { contaReceberId: id };

  // 4. Consultar os recebimentos
  const recebimentos = await prisma.recebimentoContaReceber.findMany({
    where,
    skip,
    take: limite,
    orderBy: [{ data: "desc" }, { id: "desc" }],
  });

  // 5. Contar os recebimentos dessa conta a receber
  const total = await prisma.recebimentoContaReceber.count({ where });

  const totalPagina = Math.ceil(total / limite);

  return {
    recebimentos,
    pagina,
    limite,
    total,
    totalPagina,
  };
}
