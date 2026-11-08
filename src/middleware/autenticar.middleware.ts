import type { NextFunction, Request, Response } from "express";
import type { Papel } from "../../generated/prisma/client.js";
import { prisma } from "../prisma.js";
import { verificarAccessToken } from "../services/token.service.js";

// Adiciona o req.usuario no tipo do Request do Express
declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: number;
        papel: Papel;
      };
    }
  }
}

// Exige "Authorization: Bearer <token>" e preenche req.usuario.
// Também confere no banco se o usuário ainda existe e se o token não foi
// revogado (trocar a senha ou "sair de todos" aumenta a tokenVersao)
export async function autenticar(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const cabecalho = req.headers.authorization ?? "";
  const token = cabecalho.match(/^Bearer\s+(\S+)$/i)?.[1];

  if (!token) {
    return res.status(401).json({ erro: "TOKEN NÃO ENVIADO" });
  }

  const dados = verificarAccessToken(token);

  if (!dados) {
    return res.status(401).json({ erro: "TOKEN INVÁLIDO OU EXPIRADO" });
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: dados.id },
    select: { id: true, papel: true, tokenVersao: true },
  });

  if (!usuario || usuario.tokenVersao !== dados.tokenVersao) {
    return res.status(401).json({ erro: "TOKEN INVÁLIDO OU EXPIRADO" });
  }

  req.usuario = { id: usuario.id, papel: usuario.papel };
  next();
}
