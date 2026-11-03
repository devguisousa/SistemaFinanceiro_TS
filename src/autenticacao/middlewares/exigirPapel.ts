import type { NextFunction, Request, Response } from "express";
import type { Papel } from "../../../generated/prisma/client.js";

/**
 * Libera a rota só para os papéis informados. Use depois de `autenticar`
 * (que já lê o papel atualizado do banco a cada requisição).
 *
 * Ex.: router.delete("/:id", exigirPapel("ADMIN"), deletar);
 */
export function exigirPapel(...papeis: Papel[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return res.status(401).json({ erro: "TOKEN NÃO ENVIADO" });
    }

    if (!papeis.includes(req.usuario.papel)) {
      return res.status(403).json({ erro: "ACESSO NEGADO" });
    }

    next();
  };
}

export const somenteAdmin = exigirPapel("ADMIN");
