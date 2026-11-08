import type { NextFunction, Request, Response } from "express";

// O Postgres não aceita o caractere nulo (\u0000) em texto
function temByteNulo(valor: unknown, profundidade = 0): boolean {
  if (typeof valor === "string") {
    return valor.includes("\u0000");
  }

  if (valor === null || typeof valor !== "object" || profundidade > 20) {
    return false;
  }

  for (const [chave, item] of Object.entries(valor)) {
    if (chave.includes("\u0000") || temByteNulo(item, profundidade + 1)) {
      return true;
    }
  }

  return false;
}

export function semByteNulo(req: Request, res: Response, next: NextFunction) {
  if (temByteNulo(req.body) || temByteNulo(req.query)) {
    return res.status(400).json({ erro: "CARACTERE INVÁLIDO NA REQUISIÇÃO" });
  }

  next();
}
