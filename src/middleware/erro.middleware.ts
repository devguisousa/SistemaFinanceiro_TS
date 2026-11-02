import type { Request, Response, NextFunction } from "express";
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

  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    if (erro.code === "P2002") {
      res.status(409).json({
        erro: " Registro já existente",
      });
      return;
    }

    if (erro.code === "P2003") {
      res.status(409).json({
        erro: "operação viola um relacionamento de banco",
      });
      return;
    }

    if (erro.code === "P2025") {
      res.status(404).json({
        erro: "Registro necessário não encontrado",
      });
      return;
    }
  }
  console.error(erro);

  res.status(500).json({
    erro: "erro interno do servidor",
  });
}
