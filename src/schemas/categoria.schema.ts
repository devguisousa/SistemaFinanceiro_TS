import { z } from "zod";
import {
  idTextoSchema,
  limiteSchema,
  paginaSchema,
  tipoTransacaoSchema,
} from "./comum.schema.js";

export const categoriaSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, "Nome obrigatório")
    .max(100, "Nome muito grande"),

  tipo: tipoTransacaoSchema,
});

export const idCategoriaSchema = idTextoSchema;

export const paginacaoCategoriaSchema = z.object({
  tipo: tipoTransacaoSchema.optional(),
  page: paginaSchema.optional(),
  limit: limiteSchema.optional(),
});
