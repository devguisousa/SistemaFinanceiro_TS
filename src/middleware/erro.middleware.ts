import type { NextFunction, Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { ehConflitoDeConcorrencia } from "../prisma.js";

export function errorMiddleware(
  erro: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    return next(erro);
  }

  // Erros do express.json
  if (erro instanceof Error && "type" in erro) {
    if (erro.type === "entity.parse.failed") {
      res.status(400).json({ erro: "JSON INVÁLIDO" });
      return;
    }

    if (erro.type === "entity.too.large") {
      res.status(413).json({ erro: "CORPO DA REQUISIÇÃO MUITO GRANDE" });
      return;
    }

    if (
      erro.type === "charset.unsupported" ||
      erro.type === "encoding.unsupported"
    ) {
      res.status(415).json({ erro: "CODIFICAÇÃO NÃO SUPORTADA" });
      return;
    }
  }

  if (ehConflitoDeConcorrencia(erro)) {
    res.status(409).json({ erro: "CONFLITO DE CONCORRÊNCIA, TENTE NOVAMENTE" });
    return;
  }

  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    if (erro.code === "P2002") {
      res.status(409).json({ erro: "REGISTRO JÁ EXISTENTE" });
      return;
    }

    if (erro.code === "P2003") {
      res.status(409).json({ erro: "OPERAÇÃO VIOLA UM RELACIONAMENTO DO BANCO" });
      return;
    }

    if (erro.code === "P2025") {
      res.status(404).json({ erro: "REGISTRO NECESSÁRIO NÃO ENCONTRADO" });
      return;
    }
  }

  // Outros erros 4xx do express.json que não estão acima
  if (
    erro instanceof Error &&
    "expose" in erro &&
    "status" in erro &&
    erro.expose === true &&
    typeof erro.status === "number" &&
    erro.status >= 400 &&
    erro.status < 500
  ) {
    res.status(erro.status).json({ erro: "REQUISIÇÃO INVÁLIDA" });
    return;
  }

  req.log?.error({ err: erro }, "erro não tratado");

  res.status(500).json({ erro: "ERRO INTERNO DO SERVIDOR" });
}
