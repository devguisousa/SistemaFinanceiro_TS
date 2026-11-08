import type { NextFunction, Request, Response } from "express";

// Usar depois do autenticar, que já lê o papel atualizado do banco
export function somenteAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.usuario) {
    return res.status(401).json({ erro: "TOKEN NÃO ENVIADO" });
  }

  if (req.usuario.papel !== "ADMIN") {
    return res.status(403).json({ erro: "ACESSO NEGADO" });
  }

  next();
}
