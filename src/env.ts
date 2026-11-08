import "dotenv/config";
import { z } from "zod";

// Mensagens do zod em português no projeto todo
z.config(z.locales.pt());

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL não definida no .env"),

  JWT_SEGREDO: z
    .string({ error: "JWT_SEGREDO não definido no .env" })
    .min(
      32,
      "JWT_SEGREDO precisa ter pelo menos 32 caracteres (gere com: openssl rand -hex 32)",
    ),

  // Origens liberadas no CORS, separadas por vírgula. Vazio = CORS desligado
  CORS_ORIGENS: z
    .string()
    .optional()
    .transform((valor) => {
      if (!valor) {
        return [];
      }

      return valor
        .split(",")
        .map((origem) => origem.trim())
        .filter((origem) => origem !== "");
    }),

  // Quantos proxies tem na frente da API (Nginx, Render...). 0 = nenhum
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .optional(),
});

const resultado = envSchema.safeParse(process.env);

if (!resultado.success) {
  let mensagem = "Variáveis de ambiente inválidas:";

  for (const issue of resultado.error.issues) {
    mensagem += `\n  - ${issue.path.join(".")}: ${issue.message}`;
  }

  throw new Error(mensagem);
}

export const env = resultado.data;
