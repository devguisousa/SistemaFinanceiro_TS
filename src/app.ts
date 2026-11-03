import "./config/decimal.js";
import "./config/zod.js";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { autenticar } from "./autenticacao/middlewares/autenticar.js";
import { authRotas } from "./autenticacao/routes/auth.routes.js";
import { usuarioRotas } from "./autenticacao/routes/usuario.routes.js";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middleware/erro.middleware.js";
import { semByteNulo } from "./middleware/semByteNulo.middleware.js";
import { prisma } from "./prisma.js";
import { categoriaRoutes } from "./routes/categoria.routes.js";
import { contaRoutes } from "./routes/conta.routes.js";
import { contaPagarRoutes } from "./routes/contaPagar.routes.js";
import { contaReceberRoutes } from "./routes/contaReceber.routes.js";
import { pagamentoPagarRoutes } from "./routes/pagamentoPagar.routes.js";
import { recebimentoContaReceberRoutes } from "./routes/recebimentoContaReceber.routes.js";
import { transacaoRoutes } from "./routes/transacao.routes.js";
import { transferenciaRoutes } from "./routes/transferencia.routes.js";

export const app = express();

// Atrás de proxy (Nginx, Render...), para o rate limit enxergar o IP real
app.set("trust proxy", env.TRUST_PROXY);

app.use(helmet());

if (env.CORS_ORIGENS.length > 0) {
  app.use(cors({ origin: env.CORS_ORIGENS }));
}

app.use(
  pinoHttp({
    level: env.LOG_LEVEL ?? (env.NODE_ENV === "test" ? "silent" : "info"),
    // Nunca registrar tokens
    redact: ["req.headers.authorization", "req.headers.cookie"],
  }),
);

app.use(express.json({ limit: "100kb" }));
app.use(semByteNulo);

// Rotas públicas
app.get("/health", async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.status(200).json({ status: "ok" });
});

app.use("/auth", authRotas);

// Daqui para baixo, todas as rotas exigem Bearer token
app.use(autenticar);

app.use("/usuarios", usuarioRotas);
app.use("/contas", contaRoutes);
app.use("/transacao", transacaoRoutes);
app.use("/transferencias", transferenciaRoutes);
app.use("/categoria", categoriaRoutes);
app.use("/contaPagar", contaPagarRoutes);
app.use("/pagamentoPagar", pagamentoPagarRoutes);
app.use("/", recebimentoContaReceberRoutes);
app.use("/contaReceber", contaReceberRoutes);

app.use((req, res) => {
  res.status(404).json({ erro: "ROTA NÃO ENCONTRADA" });
});

app.use(errorMiddleware);
