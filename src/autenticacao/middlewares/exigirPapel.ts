import type { NextFunction, Response } from "express";
import type { Papel } from "../../../generated/prisma/client.js";
import { prisma } from "../../prisma.js";
import type { RequisicaoAutenticada } from "./autenticar.js";

/**
 * Libera a rota só para os papéis informados. Use depois de `autenticar`.
 * O papel é lido do banco a cada requisição, então uma troca de papel
 * vale na hora (não espera o access token expirar).
 *
 * Ex.: router.delete("/:id", exigirPapel("ADMIN"), deletar);
 */
export function exigirPapel(...papeis: Papel[]) {
  return async (
    req: RequisicaoAutenticada,
    res: Response,
    next: NextFunction,
  ) => {
    if (req.usuarioId === undefined) {
      return res.status(401).json({ erro: "TOKEN NÃO ENVIADO" });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuarioId },
      select: { papel: true },
    });

    if (!usuario || !papeis.includes(usuario.papel)) {
      return res.status(403).json({ erro: "ACESSO NEGADO" });
    }

    next();
  };
}
