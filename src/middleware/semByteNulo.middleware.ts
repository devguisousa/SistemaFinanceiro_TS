import type { NextFunction, Request, Response } from "express";

function contemByteNulo(valor: unknown, profundidade = 0): boolean {
  if (typeof valor === "string") return valor.includes("\u0000");
  if (profundidade > 20 || valor === null || typeof valor !== "object") {
    return false;
  }

  return Object.entries(valor).some(
    ([chave, item]) =>
      chave.includes("\u0000") || contemByteNulo(item, profundidade + 1),
  );
}

/** Recusa textos com o caractere nulo (\u0000), que o Postgres rejeita. */
export function semByteNulo(req: Request, res: Response, next: NextFunction) {
  if (contemByteNulo(req.body) || contemByteNulo(req.query)) {
    return res.status(400).json({ erro: "CARACTERE INVÁLIDO NA REQUISIÇÃO" });
  }

  next();
}
