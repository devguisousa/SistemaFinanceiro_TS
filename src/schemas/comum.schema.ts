import { z } from "zod";

// Maior valor de uma coluna Int (INT4) do Postgres
const INT4_MAX = 2_147_483_647;

const inteiroPositivoTexto = /^[1-9]\d*$/;

// ID vindo da URL (texto): "12" -> 12. Recusa "1e3", "0x10", "-1" e ids acima do INT4
export const idTextoSchema = z
  .string()
  .regex(inteiroPositivoTexto, "ID inválido")
  .transform(Number)
  .pipe(z.int().positive().max(INT4_MAX, "ID inválido"));

// ID vindo no body (número)
export const idNumeroSchema = z
  .int("ID inválido")
  .positive("ID inválido")
  .max(INT4_MAX, "ID inválido");

export const paginaSchema = z
  .string()
  .regex(inteiroPositivoTexto, "Página inválida")
  .transform(Number)
  .pipe(z.int().positive().max(10_000, "Página máxima: 10000"));

export const limiteSchema = z
  .string()
  .regex(inteiroPositivoTexto, "Limite inválido")
  .transform(Number)
  .pipe(z.int().positive().max(100, "Limite máximo: 100"));

// Dinheiro como texto: até 10 dígitos inteiros e 2 decimais (Decimal 12,2)
export const valorSchema = z
  .string()
  .regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/, "Valor inválido")
  .refine((valor) => Number(valor) > 0, "O valor deve ser maior que zero");

// Data "AAAA-MM-DD" válida no calendário, convertida para meia-noite UTC
export const dataSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a data no formato AAAA-MM-DD")
  .refine((valor) => {
    const data = new Date(`${valor}T00:00:00.000Z`);

    return (
      !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor
    );
  }, "Data inválida")
  .transform((valor) => new Date(`${valor}T00:00:00.000Z`));

export const tipoTransacaoSchema = z.enum(["RECEITA", "DESPESA"]);

// Query "?vencidas=true"
export const booleanoQuerySchema = z
  .enum(["true", "false"])
  .transform((valor) => valor === "true");
