import { Router } from "express";
import {
  atualizar,
  buscar,
  buscarSaldo,
  cadastrar,
  deletar,
  listar,
} from "../controllers/conta.controller.js";

export const contaRoutes = Router();

contaRoutes.get("/", listar);
contaRoutes.get("/:id", buscar);
contaRoutes.get("/:id/saldo", buscarSaldo);

contaRoutes.post("/", cadastrar);
contaRoutes.put("/:id", atualizar);
contaRoutes.delete("/:id", deletar);
