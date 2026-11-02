import { z } from "zod";

export const cadastrarContaPagarSchema = z.object({
  descricao: z
    .string()
    .trim()
    .min(1, "Descrição obrigatória")
    .max(150, "Máximo de 150 caracteres"),

  valorTotal: z
    .string()
    .regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/, "Valor monetário inválido")
    .refine((valor) => Number(valor) > 0, "O valor precisa ser maior que zero"),

  vencimento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a data no formato AAAA-MM-DD")
    .refine((valor) => {
      const data = new Date(`${valor}T00:00:00.000Z`);

      return (
        !Number.isNaN(data.getTime()) &&
        data.toISOString().slice(0, 10) === valor
      );
    }, "Data inválida")
    .transform((valor) => new Date(`${valor}T00:00:00.000Z`)),
});

export const atualizarContaPagarSchema = cadastrarContaPagarSchema;

export const idContaPagarSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "ID inválido")
  .transform(Number)
  .pipe(
    z.number().int().positive().refine(Number.isSafeInteger, "ID inválido"),
  );

export const filtroContaPagarSchema = z.object({
  status: z.enum(["PENDENTE", "PARCIALMENTE_PAGA", "PAGA"]).optional(),

  page: z
    .string()
    .regex(/^[1-9]\d*$/, "Página inválida")
    .transform(Number)
    .pipe(z.number().int().positive().max(10000))
    .optional(),

  limit: z
    .string()
    .regex(/^[1-9]\d*$/, "Limite inválido")
    .transform(Number)
    .pipe(z.number().int().positive().max(100))
    .optional(),
});
