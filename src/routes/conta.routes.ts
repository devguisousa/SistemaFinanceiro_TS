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

contaRoutes.post("/", cadastrar);
contaRoutes.get("/", listar);
contaRoutes.get("/:id", buscar);
contaRoutes.put("/:id", atualizar);
contaRoutes.delete("/:id", deletar);
contaRoutes.get("/saldo", buscarSaldo);
