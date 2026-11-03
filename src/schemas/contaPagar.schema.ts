import { z } from "zod";
import {
  booleanoQuerySchema,
  dataSchema,
  idTextoSchema,
  limiteSchema,
  paginaSchema,
  valorSchema,
} from "./comum.schema.js";

export const cadastrarContaPagarSchema = z.object({
  descricao: z
    .string()
    .trim()
    .min(1, "Descrição obrigatória")
    .max(150, "Máximo de 150 caracteres"),

  valorTotal: valorSchema,

  vencimento: dataSchema,
});

export const atualizarContaPagarSchema = cadastrarContaPagarSchema;

export const idContaPagarSchema = idTextoSchema;

export const filtroContaPagarSchema = z.object({
  status: z.enum(["PENDENTE", "PARCIALMENTE_PAGA", "PAGA"]).optional(),

  // true = vencimento antes de hoje e ainda não paga
  vencidas: booleanoQuerySchema.optional(),

  page: paginaSchema.optional(),

  limit: limiteSchema.optional(),
});
