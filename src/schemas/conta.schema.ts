import { z } from "zod";

const saldoSchema = z
  .string()
  .regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/, "Saldo inválido");

export const atualizarContaSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, "Nome obrigatório")
    .max(100, "Nome muito grande"),

  saldoInicial: saldoSchema,
});

export const cadastrarContaSchema = atualizarContaSchema.extend({
  saldoInicial: saldoSchema.default("0.00"),
});

export const idContaSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "ID inválido")
  .transform(Number)
  .pipe(z.int().positive());

export const paginacaoContaSchema = z.object({
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
