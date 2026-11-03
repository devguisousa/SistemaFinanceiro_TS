import { z } from "zod";
import {
  idTextoSchema,
  limiteSchema,
  paginaSchema,
} from "../../schemas/comum.schema.js";

// E-mail salvo sempre sem espaços e em minúsculas (máx. 254, padrão RFC)
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "E-mail muito longo")
  .pipe(z.email("E-mail inválido"));

// O bcrypt só usa os primeiros 72 BYTES: "é" ocupa 2 e emoji ocupa 4
const novaSenhaSchema = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres")
  .refine(
    (senha) => Buffer.byteLength(senha, "utf8") <= 72,
    "A senha pode ter no máximo 72 bytes (acentos e emojis ocupam mais de 1)",
  );

const papelSchema = z.enum(["USUARIO", "ADMIN"]);

// Molde do cadastro (feito por um ADMIN)
export const cadastroSchema = z.object({
  email: emailSchema,
  senha: novaSenhaSchema,
  papel: papelSchema.default("USUARIO"),
});

// Molde do login: aqui só confere se mandou, não precisa de regra de tamanho
export const loginSchema = z.object({
  email: emailSchema,
  senha: z.string().min(1, "Senha obrigatória").max(1000),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token obrigatório").max(200),
});

export const trocarSenhaSchema = z
  .object({
    senhaAtual: z.string().min(1, "Senha atual obrigatória").max(1000),
    novaSenha: novaSenhaSchema,
  })
  .refine((dados) => dados.senhaAtual !== dados.novaSenha, {
    message: "A nova senha deve ser diferente da atual",
    path: ["novaSenha"],
  });

export const alterarPapelSchema = z.object({
  papel: papelSchema,
});

export const idUsuarioSchema = idTextoSchema;

export const paginacaoUsuarioSchema = z.object({
  page: paginaSchema.optional(),
  limit: limiteSchema.optional(),
});
