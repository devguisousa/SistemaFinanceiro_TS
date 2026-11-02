
import { z } from "zod";

export const registrarPagamentoSchema = z.object({
  contaId: z.number().int().positive(),

  categoriaId: z.number().int().positive(),

  valor: z.string()
    .regex(
      /^(0|[1-9]\d{0,9})(\.\d{1,2})?$/,
      "Formato de valor inválido"
    )
    .refine(
      (valor) => Number(valor) > 0,
      "O pagamento deve ser maior que zero"
    ),
});

export const idPagamentoSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const paginacaoPagamentoSchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(10),
});
