import { z } from "zod";
import {
  idNumeroSchema,
  idTextoSchema,
  limiteSchema,
  paginaSchema,
  valorSchema,
} from "./comum.schema.js";

export const transferenciaSchema = z
  .object({
    contaOrigemId: idNumeroSchema,

    contaDestinoId: idNumeroSchema,

    valor: valorSchema,

    descricao: z
      .string()
      .trim()
      .min(1, "Descrição obrigatória")
      .max(150, "Máximo de 150 caracteres")
      .default("Transferência entre contas"),
  })
  .refine((dados) => dados.contaOrigemId !== dados.contaDestinoId, {
    message: "Conta de origem e destino devem ser diferentes",
    path: ["contaDestinoId"],
  });

export const idTransferenciaSchema = idTextoSchema;

export const paginacaoTransferenciaSchema = z.object({
  page: paginaSchema.optional(),
  limit: limiteSchema.optional(),
});
