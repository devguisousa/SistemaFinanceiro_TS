import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { Prisma } from "../../../generated/prisma/client.js";
import { env } from "../../config/env.js";
import { prisma } from "../../prisma.js";

const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

type UsuarioToken = { id: number; tokenVersao: number };

export function gerarAccessToken(usuario: UsuarioToken) {
  return jwt.sign(
    { sub: String(usuario.id), ver: usuario.tokenVersao },
    env.JWT_SEGREDO,
    { algorithm: "HS256", expiresIn: "15m" },
  );
}

// Retorna id e versão do token, ou null se for inválido/expirado
export function verificarAccessToken(token: string): UsuarioToken | null {
  try {
    const payload = jwt.verify(token, env.JWT_SEGREDO, {
      algorithms: ["HS256"],
    });

    if (
      typeof payload !== "object" ||
      !/^[1-9]\d*$/.test(payload.sub ?? "") ||
      !Number.isInteger(payload.ver)
    ) {
      return null;
    }

    return { id: Number(payload.sub), tokenVersao: payload.ver as number };
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

/** Invalida todas as sessões: access tokens (pela versão) e refresh tokens. */
export async function revogarSessoes(
  usuarioId: number,
  db: Prisma.TransactionClient = prisma,
) {
  await db.usuario.update({
    where: { id: usuarioId },
    data: { tokenVersao: { increment: 1 } },
  });

  await db.refreshToken.deleteMany({ where: { usuarioId } });
}

type ResultadoRefresh =
  | { erro: "REFRESH TOKEN INVÁLIDO OU EXPIRADO" | "REFRESH TOKEN REUTILIZADO" }
  | { accessToken: string; refreshToken: string };

/**
 * Troca um refresh token por um par novo (rotação).
 * Se um token já usado for reapresentado, é sinal de vazamento:
 * todas as sessões do usuário são revogadas.
 */
export async function trocarRefreshToken(
  refreshToken: string,
): Promise<ResultadoRefresh> {
  return prisma.$transaction(async (tx) => {
    const registro = await tx.refreshToken.findUnique({
      where: { hash: hashToken(refreshToken) },
      include: { usuario: { select: { id: true, tokenVersao: true } } },
    });

    if (!registro) {
      return { erro: "REFRESH TOKEN INVÁLIDO OU EXPIRADO" } as const;
    }

    if (registro.usado) {
      await revogarSessoes(registro.usuarioId, tx);

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
      accessToken: gerarAccessToken(registro.usuario),
      refreshToken: await gerarRefreshToken(registro.usuarioId, tx),
    };
  });
}
