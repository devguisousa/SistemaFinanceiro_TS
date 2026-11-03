import { Router } from "express";
import {
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
