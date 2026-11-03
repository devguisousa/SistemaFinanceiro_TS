import type { NextFunction, Request, Response } from "express";
import { verificarAccessToken } from "../services/token.service.js";

export interface RequisicaoAutenticada extends Request {
  usuarioId?: number;
}

export function autenticar(
  req: RequisicaoAutenticada,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "TOKEN NÃO ENVIADO" });
  }

  const token = header.split(" ")[1];

  if (!token) {
    return res.status(401).json({ erro: "TOKEN NÃO ENVIADO" });
  }

  const usuarioId = verificarAccessToken(token);

  if (usuarioId === null) {
    return res.status(401).json({ erro: "TOKEN INVÁLIDO OU EXPIRADO" });
  }

  req.usuarioId = usuarioId;
  next();
}
