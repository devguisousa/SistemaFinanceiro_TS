import { Prisma } from "../../generated/prisma/client.js";
import { executarTransacao, prisma } from "../prisma.js";
import { buscarContaPagar } from "./contaPagar.service.js";
import {
  SaldoInsuficienteErro,
  garantirSaldoNaoNegativo,
} from "./saldo.service.js";

type DadosPagamento = {
  contaPagarId: number;
  contaId: number;
  categoriaId: number;
  valor: string;
};

export async function registrarPagamento(
  usuarioId: number,
  dados: DadosPagamento,
) {
  const valor = new Prisma.Decimal(dados.valor);

  try {
    return await executarTransacao(async (tx) => {
      // Conta a pagar, conta bancária e categoria precisam ser do usuário
      const contaPagar = await tx.contaPagar.findFirst({
        where: { id: dados.contaPagarId, usuarioId },
      });

      if (!contaPagar) {
        return { erro: "CONTA A PAGAR NÃO ENCONTRADA" } as const;
      }

      const conta = await tx.conta.findFirst({
        where: { id: dados.contaId, usuarioId },
      });

      if (!conta) {
        return { erro: "CONTA BANCÁRIA NÃO ENCONTRADA" } as const;
      }

      const categoria = await tx.categoria.findFirst({
        where: { id: dados.categoriaId, usuarioId },
      });

      if (!categoria) {
        return { erro: "CATEGORIA NÃO ENCONTRADA" } as const;
      }

      if (categoria.tipo !== "DESPESA") {
        return { erro: "CATEGORIA NÃO É DO TIPO DESPESA" } as const;
      }

      const saldoPendente = contaPagar.valorTotal.minus(contaPagar.valorPago);

      if (saldoPendente.lte(0)) {
        return { erro: "CONTA JÁ QUITADA" } as const;
      }

      if (valor.gt(saldoPendente)) {
        return { erro: "PAGAMENTO MAIOR QUE O SALDO PENDENTE" } as const;
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

      await garantirSaldoNaoNegativo(tx, [dados.contaId]);

      return { pagamento, transacao, contaPagar: contaAtualizada };
    });
  } catch (erro) {
    if (erro instanceof SaldoInsuficienteErro) {
      return { erro: "SALDO INSUFICIENTE" } as const;
    }

    throw erro;
  }
}

export async function listarPagamento(
  usuarioId: number,
  pagina = 1,
  limite = 10,
) {
  const skip = (pagina - 1) * limite;

  const where = { contaPagar: { usuarioId } };

  const pagamento = await prisma.pagamentoContaPagar.findMany({
    where,
    skip,
    take: limite,
    orderBy: [{ data: "desc" }, { id: "desc" }],
  });

  const total = await prisma.pagamentoContaPagar.count({ where });

  const totalPagina = Math.ceil(total / limite);

  return { pagamento, pagina, limite, total, totalPagina };
}

export async function buscarPagamento(usuarioId: number, id: number) {
  const pagamento = await prisma.pagamentoContaPagar.findFirst({
    where: { id, contaPagar: { usuarioId } },
  });

  if (!pagamento) {
    return { erro: "PAGAMENTO NÃO ENCONTRADO" } as const;
  }

  return { pagamento };
}

export async function listarPagamentoContaPagar(
  usuarioId: number,
  id: number,
  pagina = 1,
  limite = 10,
) {
  const contaPagar = await buscarContaPagar(usuarioId, id);

  if ("erro" in contaPagar) {
    return contaPagar;
  }

  const skip = (pagina - 1) * limite;

  const where = { contaPagarId: id };

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
