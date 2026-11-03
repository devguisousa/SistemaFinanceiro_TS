import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../prisma.js";

const TENTATIVAS = 5;

/**
 * Conflito de concorrência do Postgres (serialization failure / deadlock).
 * Com driver adapter ele chega como DriverAdapterError "TransactionWriteConflict";
 * sem adapter, como P2034.
 */
export function ehConflitoDeConcorrencia(erro: unknown): boolean {
  if (
    erro instanceof Prisma.PrismaClientKnownRequestError &&
    erro.code === "P2034"
  ) {
    return true;
  }

  if (erro instanceof Error && erro.name === "DriverAdapterError") {
    const causa = (erro as Error & { cause?: { kind?: string; code?: string } })
      .cause;

    return (
      erro.message === "TransactionWriteConflict" ||
      causa?.kind === "TransactionWriteConflict" ||
      causa?.code === "40001" ||
      causa?.code === "40P01"
    );
  }

  return false;
}

/**
 * Roda uma transação Serializable e, se houver conflito de concorrência,
 * tenta de novo (até 5 vezes, com espera crescente). Se ainda falhar,
 * o erro sobe e o middleware responde 409 "TENTE NOVAMENTE".
 */
export async function executarTransacao<T>(
  operacao: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await prisma.$transaction(operacao, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (erro) {
      if (!ehConflitoDeConcorrencia(erro) || tentativa >= TENTATIVAS) {
        throw erro;
      }

      // Espera aleatória crescente para as requisições não colidirem de novo
      await new Promise((resolver) =>
        setTimeout(resolver, 15 * tentativa + Math.random() * 50 * tentativa),
      );
    }
  }
}
