import { Router } from "express";
import { somenteAdmin } from "../middleware/somenteAdmin.middleware.js";
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

// Somente ADMIN
contaRoutes.post("/", somenteAdmin, cadastrar);
contaRoutes.put("/:id", somenteAdmin, atualizar);
contaRoutes.delete("/:id", somenteAdmin, deletar);
