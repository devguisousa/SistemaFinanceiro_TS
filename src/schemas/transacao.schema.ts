import { z } from "zod";

export const transacaoSchema = z.object({
  descricao: z
    .string()
    .trim()
    .min(1, "Descrição obrigatória")
    .max(200, "Descrição muito grande"),

  valor: z
    .string()
    .regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/, "Valor inválido")
    .refine((valor) => Number(valor) > 0, "O valor deve ser maior que zero"),

  tipo: z.enum(["RECEITA", "DESPESA"]),

  contaId: z.number().int().positive(),

  categoriaId: z.number().int().positive(),
});

export const idTransacaoSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "ID inválido")
  .transform(Number)
  .pipe(z.int().positive());

const numeroPositivo = z
  .string()
  .regex(/^[1-9]\d*$/, "Deve ser um inteiro positivo")
  .transform(Number)
  .pipe(z.number().int().positive());

export const paginacaoTransacaoSchema = z.object({
  page: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().positive())
    .optional(),

  limit: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().positive().max(100))
    .optional(),
});

export const filtroTransacaoSchema = paginacaoTransacaoSchema.extend({
  tipo: z.enum(["RECEITA", "DESPESA"]).optional(),

  contaId: numeroPositivo.optional(),

  categoriaId: numeroPositivo.optional(),
});
