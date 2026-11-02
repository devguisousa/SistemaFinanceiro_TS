import express from "express";
import { contaRoutes } from "./routes/conta.routes.js";
import { transacaoRoutes } from "./routes/transacao.routes.js";
import { categoriaRoutes } from "./routes/categoria.routes.js";
import { errorMiddleware } from "./middleware/erro.middleware.js";
import { contaPagarRoutes } from "./routes/contaPagar.routes.js";
import { pagamentoPagarRoutes } from "./routes/pagametoPagar.routes.js";
import { contaReceberRoutes } from "./routes/contaReceber.routes.js";


const app = express();
app.use(express.json());

app.use("/contas", contaRoutes);
app.use("/transacao", transacaoRoutes);
app.use("/categoria", categoriaRoutes);
app.use("/contaPagar", contaPagarRoutes)
app.use("/pagamentoPagar", pagamentoPagarRoutes)
app.use("/", contaReceberRoutes)


app.use(errorMiddleware)
app.listen(3000, () => {
  console.log("rodando");
});
