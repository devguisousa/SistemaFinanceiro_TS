import type { Response } from "express";
import type { z } from "zod";

// Erros de entrada que não dependem do banco
const ERROS_400 = new Set(["VALOR DEVE SER MAIOR QUE ZERO"]);

/** 404 para "NÃO ENCONTRADA/O", 400 para entrada inválida, 409 para regra de negócio. */
export function statusDoErro(erro: string) {
  if (erro.includes("NÃO ENCONTRAD")) return 404;
  if (ERROS_400.has(erro)) return 400;
  return 409;
}

export function responderErro(res: Response, erro: string) {
  res.status(statusDoErro(erro)).json({ erro });
}

type Mensagem = "DADOS INVÁLIDOS" | "ID INVÁLIDO" | "PARÂMETROS INVÁLIDOS";

/** Valida com Zod; se falhar, já responde 400 e devolve null. */
export function validar<T extends z.ZodType>(
  res: Response,
  schema: T,
  entrada: unknown,
  mensagem: Mensagem,
): z.output<T> | null {
  const resultado = schema.safeParse(entrada);

  if (!resultado.success) {
    res.status(400).json({ erro: mensagem, detalhes: resultado.error.issues });
    return null;
  }

  return resultado.data;
}
