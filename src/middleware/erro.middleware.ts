import type { NextFunction, Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client.js";

export function errorMiddleware(
  erro: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    return next(erro);
  }

  // Body com JSON malformado (lançado pelo express.json)
  if (
    erro instanceof SyntaxError &&
    "type" in erro &&
    erro.type === "entity.parse.failed"
  ) {
    res.status(400).json({ erro: "JSON INVÁLIDO" });
    return;
  }

  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    if (erro.code === "P2002") {
      res.status(409).json({ erro: "REGISTRO JÁ EXISTENTE" });
      return;
    }

    if (erro.code === "P2003") {
      res
        .status(409)
        .json({ erro: "OPERAÇÃO VIOLA UM RELACIONAMENTO DO BANCO" });
      return;
    }

    if (erro.code === "P2025") {
      res.status(404).json({ erro: "REGISTRO NECESSÁRIO NÃO ENCONTRADO" });
      return;
    }
  }

  console.error(erro);

  res.status(500).json({ erro: "ERRO INTERNO DO SERVIDOR" });
}
