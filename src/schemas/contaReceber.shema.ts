
import { z } from "zod";

export const contaReceberSchema = z.object({
  descricao: z.string()
    .trim()
    .min(1, "DESCRIÇÃO OBRIGATÓRIA")
    .max(200, "DESCRIÇÃO MUITO LONGA"),

  valorTotal: z.string()
    .regex(
      /^(0|[1-9]\d{0,9})(\.\d{1,2})?$/,
      "VALOR INVÁLIDO"
    )
    .refine(
      (valor) => Number(valor) > 0,
      "VALOR DEVE SER MAIOR QUE ZERO"
    ),

  vencimento: z.iso.date()
    .transform((data) => new Date(`${data}T00:00:00.000Z`)),
});

export const idContaReceberSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const paginacaoContaReceberSchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(10),
});
