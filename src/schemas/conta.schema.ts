import { z } from "zod";
import { idTextoSchema, limiteSchema, paginaSchema } from "./comum.schema.js";

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

export const idContaSchema = idTextoSchema;

export const paginacaoContaSchema = z.object({
  page: paginaSchema.optional(),
  limit: limiteSchema.optional(),
});
