import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../prisma.js";
import { verificarAccessToken } from "../services/token.service.js";

/**
 * Exige "Authorization: Bearer <token>" válido e preenche req.usuario.
 * Confere no banco se o usuário ainda existe e se o token não foi revogado
 * (troca de senha / sair de todos aumentam a versão do token).
 */
export async function autenticar(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? "")?.[1];

  if (!token) {
    return res.status(401).json({ erro: "TOKEN NÃO ENVIADO" });
  }

  const dados = verificarAccessToken(token);

  const usuario =
    dados &&
    (await prisma.usuario.findUnique({
      where: { id: dados.id },
      select: { id: true, papel: true, tokenVersao: true },
    }));

  if (!dados || !usuario || usuario.tokenVersao !== dados.tokenVersao) {
    return res.status(401).json({ erro: "TOKEN INVÁLIDO OU EXPIRADO" });
  }

  req.usuario = { id: usuario.id, papel: usuario.papel };
  next();
}
