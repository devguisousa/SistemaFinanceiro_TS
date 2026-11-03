import type { NextFunction, Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { ehConflitoDeConcorrencia } from "../utils/transacao.js";

// Erros lançados pelo express.json (body-parser)
const ERROS_DO_BODY: Record<string, { status: number; erro: string }> = {
  "entity.parse.failed": { status: 400, erro: "JSON INVÁLIDO" },
  "entity.too.large": { status: 413, erro: "CORPO DA REQUISIÇÃO MUITO GRANDE" },
  "charset.unsupported": { status: 415, erro: "CODIFICAÇÃO NÃO SUPORTADA" },
  "encoding.unsupported": { status: 415, erro: "CODIFICAÇÃO NÃO SUPORTADA" },
};

const ERROS_DO_PRISMA: Record<string, { status: number; erro: string }> = {
  P2002: { status: 409, erro: "REGISTRO JÁ EXISTENTE" },
  P2003: { status: 409, erro: "OPERAÇÃO VIOLA UM RELACIONAMENTO DO BANCO" },
  P2025: { status: 404, erro: "REGISTRO NECESSÁRIO NÃO ENCONTRADO" },
};

export function errorMiddleware(
  erro: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    return next(erro);
  }

  if (
    erro instanceof Error &&
    "type" in erro &&
    typeof erro.type === "string"
  ) {
    const conhecido = ERROS_DO_BODY[erro.type];

    if (conhecido) {
      res.status(conhecido.status).json({ erro: conhecido.erro });
      return;
    }
  }

  if (ehConflitoDeConcorrencia(erro)) {
    res.status(409).json({ erro: "CONFLITO DE CONCORRÊNCIA, TENTE NOVAMENTE" });
    return;
  }

  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    const conhecido = ERROS_DO_PRISMA[erro.code];

    if (conhecido) {
      res.status(conhecido.status).json({ erro: conhecido.erro });
      return;
    }
  }

  // Outros erros HTTP "seguros" (ex.: 4xx do body-parser não mapeados)
  if (
    erro instanceof Error &&
    "expose" in erro &&
    erro.expose === true &&
    "status" in erro &&
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
