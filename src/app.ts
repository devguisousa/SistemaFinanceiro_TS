import express from "express";
import { errorMiddleware } from "./middleware/erro.middleware.js";
import { categoriaRoutes } from "./routes/categoria.routes.js";
import { contaRoutes } from "./routes/conta.routes.js";
import { contaPagarRoutes } from "./routes/contaPagar.routes.js";
import { contaReceberRoutes } from "./routes/contaReceber.routes.js";
import { pagamentoPagarRoutes } from "./routes/pagamentoPagar.routes.js";
import { recebimentoContaReceberRoutes } from "./routes/recebimentoContaReceber.routes.js";
import { transacaoRoutes } from "./routes/transacao.routes.js";

export const app = express();

app.use(express.json());

app.use("/contas", contaRoutes);
app.use("/transacao", transacaoRoutes);
app.use("/categoria", categoriaRoutes);
app.use("/contaPagar", contaPagarRoutes);
app.use("/pagamentoPagar", pagamentoPagarRoutes);
app.use("/", recebimentoContaReceberRoutes);
app.use("/contaReceber", contaReceberRoutes);

app.use((req, res) => {
  res.status(404).json({ erro: "ROTA NÃO ENCONTRADA" });
});

app.use(errorMiddleware);
