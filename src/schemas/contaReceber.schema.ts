import { z } from "zod";
import {
  booleanoQuerySchema,
  dataSchema,
  idTextoSchema,
  limiteSchema,
  paginaSchema,
  valorSchema,
} from "./comum.schema.js";

export const contaReceberSchema = z.object({
  descricao: z
    .string()
    .trim()
    .min(1, "DESCRIÇÃO OBRIGATÓRIA")
    .max(200, "DESCRIÇÃO MUITO LONGA"),

  valorTotal: valorSchema,

  vencimento: dataSchema,
});

export const idContaReceberSchema = z.object({
  id: idTextoSchema,
});

export const paginacaoContaReceberSchema = z.object({
  status: z.enum(["PENDENTE", "PARCIALMENTE_RECEBIDA", "RECEBIDA"]).optional(),

  // true = vencimento antes de hoje e ainda não recebida
  vencidas: booleanoQuerySchema.optional(),

  pagina: paginaSchema.default(1),
  limite: limiteSchema.default(10),
});
