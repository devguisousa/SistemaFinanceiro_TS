import { z } from "zod";

export const recebimentoSchema = z.object({
  contaId: z.number().int().positive(),

  categoriaId: z.number().int().positive(),

  valor: z
    .string()
    .regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/, "VALOR INVÁLIDO")
    .refine((valor) => Number(valor) > 0, "VALOR DEVE SER MAIOR QUE ZERO"),
});

export const idRecebimentoSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const paginacaoRecebimentoSchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(10),
});
