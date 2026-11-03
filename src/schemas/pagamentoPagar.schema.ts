import { z } from "zod";
import {
  idNumeroSchema,
  idTextoSchema,
  limiteSchema,
  paginaSchema,
  valorSchema,
} from "./comum.schema.js";

export const registrarPagamentoSchema = z.object({
  contaId: idNumeroSchema,

  categoriaId: idNumeroSchema,

  valor: valorSchema,
});

export const idPagamentoSchema = z.object({
  id: idTextoSchema,
});

export const paginacaoPagamentoSchema = z.object({
  pagina: paginaSchema.default(1),
  limite: limiteSchema.default(10),
});
