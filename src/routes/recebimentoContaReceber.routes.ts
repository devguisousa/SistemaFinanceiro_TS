import { Router } from "express";
import {
  apagar,
  buscar,
  cadastrar,
  listar,
  listarPorContaReceber,
} from "../controllers/recebimentoContaReceber.controller.js";

export const recebimentoContaReceberRoutes = Router();

recebimentoContaReceberRoutes.get("/recebimentos", listar);
recebimentoContaReceberRoutes.get("/recebimentos/:id", buscar);
recebimentoContaReceberRoutes.get(
  "/contaReceber/:id/recebimentos",
  listarPorContaReceber,
);

// Lançamento: qualquer usuário logado
recebimentoContaReceberRoutes.post("/contaReceber/:id/recebimentos", cadastrar);

// Desfaz o recebimento (o valor sai da conta)
recebimentoContaReceberRoutes.delete("/recebimentos/:id", apagar);
