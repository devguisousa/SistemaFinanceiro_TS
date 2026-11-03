import { z } from "zod";

// E-mail salvo sempre sem espaços e em minúsculas
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("E-mail inválido"));

// Molde do cadastro
export const cadastroSchema = z.object({
  email: emailSchema,
  senha: z
    .string()
    .min(6, "A senha precisa ter pelo menos 6 caracteres")
    .max(72, "A senha pode ter no máximo 72 caracteres"),
});

// Molde do login: aqui só confere se mandou, não precisa de regra de tamanho
export const loginSchema = z.object({
  email: emailSchema,
  senha: z.string().min(1, "Senha obrigatória"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token obrigatório"),
});
