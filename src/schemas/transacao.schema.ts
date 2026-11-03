import { z } from "zod";
import {
  idNumeroSchema,
  idTextoSchema,
  limiteSchema,
  paginaSchema,
  tipoTransacaoSchema,
  valorSchema,
} from "./comum.schema.js";

// Data da transação: "AAAA-MM-DD" ou data/hora ISO ("2026-11-03T14:30:00-03:00")
const dataTransacaoSchema = z
  .union([z.iso.datetime({ offset: true }), z.iso.date()])
  .transform((valor) =>
    valor.length === 10 ? new Date(`${valor}T00:00:00.000Z`) : new Date(valor),
  );

export const transacaoSchema = z.object({
  descricao: z
    .string()
    .trim()
    .min(1, "Descrição obrigatória")
    .max(200, "Descrição muito grande"),

  valor: valorSchema,

  tipo: tipoTransacaoSchema,

  contaId: idNumeroSchema,

  categoriaId: idNumeroSchema,

  // Opcional: sem data, usa o momento atual (ou mantém a atual na edição)
  data: dataTransacaoSchema.optional(),
});

export const idTransacaoSchema = idTextoSchema;

export const paginacaoTransacaoSchema = z.object({
  page: paginaSchema.optional(),
  limit: limiteSchema.optional(),
});

export const filtroTransacaoSchema = paginacaoTransacaoSchema.extend({
  tipo: tipoTransacaoSchema.optional(),

  contaId: idTextoSchema.optional(),

  categoriaId: idTextoSchema.optional(),
});
