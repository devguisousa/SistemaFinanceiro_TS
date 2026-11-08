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

// Limites de um período (início e fim entram): data/hora ISO com fuso, ou
// "AAAA-MM-DD", que vale do começo (início) ou do fim (fim) do dia em UTC.
// O front manda o começo e o fim do dia no fuso de quem está usando
const limitePeriodoSchema = (fimDoDia: boolean) =>
  z
    .union([z.iso.datetime({ offset: true }), z.iso.date()])
    .transform((valor) =>
      valor.length === 10
        ? new Date(`${valor}T${fimDoDia ? "23:59:59.999" : "00:00:00.000"}Z`)
        : new Date(valor),
    );

const inicioSchema = limitePeriodoSchema(false);
const fimSchema = limitePeriodoSchema(true);

type Periodo = { inicio?: Date | undefined; fim?: Date | undefined };

const periodoEmOrdem = ({ inicio, fim }: Periodo) =>
  !inicio || !fim || inicio <= fim;

const erroPeriodo = {
  message: "O início do período deve vir antes do fim",
  path: ["fim"],
};

export const filtroTransacaoSchema = paginacaoTransacaoSchema
  .extend({
    tipo: tipoTransacaoSchema.optional(),

    contaId: idTextoSchema.optional(),

    categoriaId: idTextoSchema.optional(),

    inicio: inicioSchema.optional(),

    fim: fimSchema.optional(),
  })
  .refine(periodoEmOrdem, erroPeriodo);

export const resumoTransacaoSchema = z
  .object({
    inicio: inicioSchema,

    fim: fimSchema,
  })
  .refine(periodoEmOrdem, erroPeriodo);
