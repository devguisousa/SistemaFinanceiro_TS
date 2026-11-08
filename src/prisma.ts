import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });

// Todo Decimal do banco é dinheiro (12,2): no JSON sai sempre com 2 casas ("0.00")
Prisma.Decimal.prototype.toJSON = function (this: Prisma.Decimal) {
  return this.toFixed(2);
};

// Conflito de concorrência do Postgres (serialization failure ou deadlock).
// Com o adapter pg ele chega como DriverAdapterError; sem o adapter, como P2034
export function ehConflitoDeConcorrencia(erro: unknown) {
  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    return erro.code === "P2034";
  }

  if (erro instanceof Error && erro.name === "DriverAdapterError") {
    const causa = erro.cause as { kind?: string; code?: string } | undefined;

    return (
      erro.message === "TransactionWriteConflict" ||
      causa?.kind === "TransactionWriteConflict" ||
      causa?.code === "40001" ||
      causa?.code === "40P01"
    );
  }

  return false;
}

// Roda uma transação Serializable. Se der conflito de concorrência, tenta de
// novo (até 5 vezes). Se ainda assim falhar, o erro sobe e o errorMiddleware
// responde 409
export async function executarTransacao<T>(
  operacao: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  let tentativa = 1;

  while (true) {
    try {
      return await prisma.$transaction(operacao, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (erro) {
      if (!ehConflitoDeConcorrencia(erro) || tentativa >= 5) {
        throw erro;
      }

      // Espera um tempo aleatório, maior a cada tentativa, para as
      // requisições não baterem de novo
      const espera = tentativa * (15 + Math.random() * 50);
      await new Promise((resolve) => setTimeout(resolve, espera));

      tentativa++;
    }
  }
}
