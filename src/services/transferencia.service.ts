import { Prisma } from "../../generated/prisma/client.js";
import { executarTransacao, prisma } from "../prisma.js";
import { categoriaDoSistema } from "./categoria.service.js";
import {
  SaldoInsuficienteErro,
  garantirSaldoNaoNegativo,
} from "./saldo.service.js";

type DadosTransferencia = {
  contaOrigemId: number;
  contaDestinoId: number;
  valor: string;
  descricao: string;
};

// Junto com a transferência, devolve os dois lançamentos que ela gerou
const incluirTransacoes = {
  transacoes: { select: { id: true, tipo: true, contaId: true } },
} as const;

// Cria a transferência e dois lançamentos: DESPESA na origem e RECEITA no destino
export async function transferir(dados: DadosTransferencia) {
  const valor = new Prisma.Decimal(dados.valor);

  try {
    return await executarTransacao(async (tx) => {
      const origem = await tx.conta.findUnique({
        where: { id: dados.contaOrigemId },
      });

      if (!origem) {
        return { erro: "CONTA DE ORIGEM NÃO ENCONTRADA" } as const;
      }

      const destino = await tx.conta.findUnique({
        where: { id: dados.contaDestinoId },
      });

      if (!destino) {
        return { erro: "CONTA DE DESTINO NÃO ENCONTRADA" } as const;
      }

      const saida = await categoriaDoSistema(tx, "Transferência enviada");
      const entrada = await categoriaDoSistema(tx, "Transferência recebida");

      const transferencia = await tx.transferencia.create({
        data: {
          valor,
          descricao: dados.descricao,
          contaOrigemId: origem.id,
          contaDestinoId: destino.id,
        },
      });

      await tx.transacao.createMany({
        data: [
          {
            descricao: `${dados.descricao} → ${destino.nome}`.slice(0, 200),
            valor,
            tipo: "DESPESA",
            contaId: origem.id,
            categoriaId: saida.id,
            transferenciaId: transferencia.id,
            data: transferencia.data,
          },
          {
            descricao: `${dados.descricao} ← ${origem.nome}`.slice(0, 200),
            valor,
            tipo: "RECEITA",
            contaId: destino.id,
            categoriaId: entrada.id,
            transferenciaId: transferencia.id,
            data: transferencia.data,
          },
        ],
      });

      await garantirSaldoNaoNegativo(tx, [origem.id]);

      const completa = await tx.transferencia.findUniqueOrThrow({
        where: { id: transferencia.id },
        include: incluirTransacoes,
      });

      return { transferencia: completa };
    });
  } catch (erro) {
    if (erro instanceof SaldoInsuficienteErro) {
      return { erro: "SALDO INSUFICIENTE" } as const;
    }

    throw erro;
  }
}

export async function listarTransferencias(pagina = 1, limite = 10) {
  const skip = (pagina - 1) * limite;

  const transferencias = await prisma.transferencia.findMany({
    skip,
    take: limite,
    orderBy: [{ data: "desc" }, { id: "desc" }],
    include: incluirTransacoes,
  });

  const total = await prisma.transferencia.count();

  const totalPaginas = Math.ceil(total / limite);

  return { transferencias, total, pagina, limite, totalPaginas };
}

export async function buscarTransferencia(id: number) {
  const transferencia = await prisma.transferencia.findUnique({
    where: { id },
    include: incluirTransacoes,
  });

  if (!transferencia) {
    return { erro: "TRANSFERÊNCIA NÃO ENCONTRADA" } as const;
  }

  return { transferencia };
}

// Estorno: apaga a transferência e os dois lançamentos
export async function estornarTransferencia(id: number) {
  try {
    return await executarTransacao(async (tx) => {
      const transferencia = await tx.transferencia.findUnique({
        where: { id },
      });

      if (!transferencia) {
        return { erro: "TRANSFERÊNCIA NÃO ENCONTRADA" } as const;
      }

      await tx.transacao.deleteMany({ where: { transferenciaId: id } });
      await tx.transferencia.delete({ where: { id } });

      // Tirar o dinheiro do destino não pode deixar a conta negativa
      await garantirSaldoNaoNegativo(tx, [transferencia.contaDestinoId]);

      return { transferencia };
    });
  } catch (erro) {
    if (erro instanceof SaldoInsuficienteErro) {
      return { erro: "SALDO INSUFICIENTE NA CONTA DE DESTINO" } as const;
    }

    throw erro;
  }
}
