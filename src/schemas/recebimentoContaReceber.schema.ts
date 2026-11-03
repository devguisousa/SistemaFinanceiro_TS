import { z } from "zod";
import {
  idNumeroSchema,
  idTextoSchema,
  limiteSchema,
  paginaSchema,
  valorSchema,
} from "./comum.schema.js";

export const recebimentoSchema = z.object({
  contaId: idNumeroSchema,

  categoriaId: idNumeroSchema,

  valor: valorSchema,
});

export const idRecebimentoSchema = z.object({
  id: idTextoSchema,
});

export const paginacaoRecebimentoSchema = z.object({
  pagina: paginaSchema.default(1),
  limite: limiteSchema.default(10),
});
