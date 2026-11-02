import { Router } from "express";
import {
  buscar,
  cadastrar,
  listar,
  listarPorContaReceber,
} from "../controllers/recebimentoContaReceber.controller.js";

export const recebimentoContaReceberRoutes = Router();

recebimentoContaReceberRoutes.post("/contaReceber/:id/recebimentos", cadastrar);
recebimentoContaReceberRoutes.get(
  "/contaReceber/:id/recebimentos",
  listarPorContaReceber,
);
recebimentoContaReceberRoutes.get("/recebimentos", listar);
recebimentoContaReceberRoutes.get("/recebimentos/:id", buscar);
