import { z } from "zod";
import { idTextoSchema, limiteSchema, paginaSchema } from "./comum.schema.js";

const saldoSchema = z
  .string()
  .regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/, "Saldo inválido");

const nomeSchema = z
  .string()
  .trim()
  .min(1, "Nome obrigatório")
  .max(100, "Nome muito grande");

export const cadastrarContaSchema = z.object({
  nome: nomeSchema,

  saldoInicial: saldoSchema.default("0.00"),
});

// Na edição o usuário digita o saldo atual (opcional): ele vira o saldo da
// conta, sem descontar o que já foi pago ou recebido
export const atualizarContaSchema = z.object({
  nome: nomeSchema,

  saldoAtual: saldoSchema.optional(),
});

export const idContaSchema = idTextoSchema;

export const paginacaoContaSchema = z.object({
  page: paginaSchema.optional(),
  limit: limiteSchema.optional(),
});
