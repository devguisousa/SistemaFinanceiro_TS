import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../prisma.js";
import { buscarContaPagar } from "./contaPagar.service.js";

type DadosPagamento = {
  contaPagarId: number;
  contaId: number;
  categoriaId: number;
  valor: string;
};

export async function registrarPagamento(dados: DadosPagamento) {
  const valor = new Prisma.Decimal(dados.valor);

  return prisma.$transaction(
    async (tx) => {
      const contaPagar = await tx.contaPagar.findUnique({
        where: { id: dados.contaPagarId },
      });

      if (!contaPagar) {
        return {
          erro: "CONTA A PAGAR NÃO ENCONTRADA",
        } as const;
      }

      const conta = await tx.conta.findUnique({
        where: {
          id: dados.contaId,
        },
      });

      if (!conta) {
        return { erro: "CONTA BANCÁRIA NÃO ENCONTRADA" } as const;
      }

      const categoria = await tx.categoria.findUnique({
        where: {
          id: dados.categoriaId,
        },
      });

      if (!categoria) {
        return {
          erro: "CATEGORIA NÃO ENCONTRADA",
        } as const;
      }

      const saldoPendente = contaPagar.valorTotal.minus(contaPagar.valorPago);

      if (saldoPendente.lte(0)) {
        return { erro: "CONTA JA QUITADA" } as const;
      }

      if (valor.gt(saldoPendente)) {
        return {
          erro: "PAGAMENTO MAIOR QUE SALDO PEDENTE",
        } as const;
      }

      const novoValorPago = contaPagar.valorPago.plus(valor);

      const novoStatus = novoValorPago.eq(contaPagar.valorTotal)
        ? "PAGA"
        : "PARCIALMENTE_PAGA";

      const pagamento = await tx.pagamentoContaPagar.create({
        data: {
          valor,
          contaPagarId: dados.contaPagarId,
          contaId: dados.contaId,
        },
      });

      const transacao = await tx.transacao.create({
        data: {
          descricao: `Pagamento: ${contaPagar.descricao}`.slice(0, 200),
          valor,
          tipo: "DESPESA",
          contaId: dados.contaId,
          categoriaId: dados.categoriaId,
          pagamentoContaPagarId: pagamento.id,
        },
      });

      const contaAtualizada = await tx.contaPagar.update({
        where: { id: dados.contaPagarId },
        data: {
          valorPago: novoValorPago,
          status: novoStatus,
        },
      });

      return { pagamento, transacao, contaPagar: contaAtualizada };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function listarPagamento(pagina = 1, limite = 10) {
  const skip = (pagina - 1) * limite;
  const pagamento = await prisma.pagamentoContaPagar.findMany({
    skip,
    take: limite,
    orderBy: [
      {
        data: "desc",
      },
      { id: "asc" },
    ],
  });

  const total = await prisma.pagamentoContaPagar.count();

  const totalPagina = Math.ceil(total / limite);

  return { pagamento, pagina, limite, total, totalPagina };
}

export async function buscarPagamento(id: number) {
  const pagamento = await prisma.pagamentoContaPagar.findUnique({
    where: { id },
  });

  if (!pagamento) {
    return { erro: "PAGAMENTO NÃO REGISTRADO" } as const;
  }

  return { pagamento };
}

export async function listarPagamentoContaPagar(
  id: number,
  pagina = 1,
  limite = 10,
) {
  const contaPagar = await buscarContaPagar(id);

  const skip = (pagina - 1) * limite;

  if ("erro" in contaPagar) {
    return { erro: contaPagar.erro };
  }

  const where = {
    contaPagarId: id,
  };

  const pagamentoContaPagar = await prisma.pagamentoContaPagar.findMany({
    where,
    skip,
    take: limite,
    orderBy: [{ data: "desc" }, { id: "desc" }],
  });

  const total = await prisma.pagamentoContaPagar.count({ where });

  const totalPagina = Math.ceil(total / limite);

  return { pagamentoContaPagar, pagina, limite, total, totalPagina };
}
