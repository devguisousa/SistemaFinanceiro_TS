import express from "express";
import { contaRoutes } from "./routes/conta.routes.js";
import { transacaoRoutes } from "./routes/transacao.routes.js";

const app = express();
app.use(express.json());

app.use("/contas", contaRoutes);
app.use("/transacao", transacaoRoutes);
app.listen(3000, () => {
  console.log("rodando");
});
