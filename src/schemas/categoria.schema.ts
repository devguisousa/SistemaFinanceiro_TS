import { z } from "zod";

export const categoriaSchema = z.object({
  nome: z.string()
    .trim()
    .min(1, "Nome obrigatório")
    .max(100, "Nome muito grande"),
});

export const idCategoriaSchema = z.string()
  .regex(/^[1-9]\d*$/, "ID inválido")
  .transform(Number)
  .pipe(z.int().positive());



export const paginacaoCategoriaSchema = z.object({
  page: z.string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().positive())
    .optional(),

  limit: z.string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().positive().max(100))
    .optional(),
});

