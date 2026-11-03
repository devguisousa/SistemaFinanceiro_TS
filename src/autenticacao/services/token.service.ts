import "dotenv/config";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../prisma.js";

const segredo = process.env.JWT_SEGREDO;

// Falha ao subir o servidor, e não no primeiro login
if (!segredo) {
  throw new Error("JWT_SEGREDO não definido no .env");
}

const JWT_SEGREDO: string = segredo;

const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

export function gerarAccessToken(usuarioId: number) {
  return jwt.sign({ sub: String(usuarioId) }, JWT_SEGREDO, {
    algorithm: "HS256",
    expiresIn: "15m",
  });
}

// Retorna o id do usuário, ou null se o token for inválido/expirado
export function verificarAccessToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, JWT_SEGREDO, { algorithms: ["HS256"] });

    if (typeof payload !== "object" || !/^[1-9]\d*$/.test(payload.sub ?? "")) {
      return null;
    }

    return Number(payload.sub);
  } catch {
    return null;
  }
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function gerarRefreshToken(
  usuarioId: number,
  db: Prisma.TransactionClient = prisma,
) {
  const token = crypto.randomBytes(40).toString("hex");

  await db.refreshToken.create({
    data: {
      hash: hashToken(token),
      usuarioId,
      expiraEm: new Date(Date.now() + SETE_DIAS_MS),
    },
  });

  return token;
}

// Remove tokens vencidos do usuário para não acumular no banco
export async function limparTokensExpirados(
  usuarioId: number,
  db: Prisma.TransactionClient = prisma,
) {
  await db.refreshToken.deleteMany({
    where: { usuarioId, expiraEm: { lt: new Date() } },
  });
}

type ResultadoRefresh =
  | { erro: "REFRESH TOKEN INVÁLIDO OU EXPIRADO" | "REFRESH TOKEN REUTILIZADO" }
  | { accessToken: string; refreshToken: string };

/**
 * Troca um refresh token por um par novo (rotação).
 * Se um token já usado for reapresentado, é sinal de vazamento:
 * todos os tokens do usuário são revogados e ele precisa logar de novo.
 */
export async function trocarRefreshToken(
  refreshToken: string,
): Promise<ResultadoRefresh> {
  return prisma.$transaction(async (tx) => {
    const registro = await tx.refreshToken.findUnique({
      where: { hash: hashToken(refreshToken) },
    });

    if (!registro) {
      return { erro: "REFRESH TOKEN INVÁLIDO OU EXPIRADO" } as const;
    }

    if (registro.usado) {
      await tx.refreshToken.deleteMany({
        where: { usuarioId: registro.usuarioId },
      });

      return { erro: "REFRESH TOKEN REUTILIZADO" } as const;
    }

    if (registro.expiraEm < new Date()) {
      return { erro: "REFRESH TOKEN INVÁLIDO OU EXPIRADO" } as const;
    }

    // updateMany com "usado: false" garante que só uma requisição
    // concorrente consegue usar o mesmo token
    const marcado = await tx.refreshToken.updateMany({
      where: { id: registro.id, usado: false },
      data: { usado: true, usadoEm: new Date() },
    });

    if (marcado.count === 0) {
      return { erro: "REFRESH TOKEN INVÁLIDO OU EXPIRADO" } as const;
    }

    await limparTokensExpirados(registro.usuarioId, tx);

    return {
      accessToken: gerarAccessToken(registro.usuarioId),
      refreshToken: await gerarRefreshToken(registro.usuarioId, tx),
    };
  });
}
