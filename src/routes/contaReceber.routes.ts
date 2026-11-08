import { Router } from "express";
import { somenteAdmin } from "../middleware/somenteAdmin.middleware.js";
import {
  atualizar,
  buscar,
  cadastrar,
  deletar,
  listar,
} from "../controllers/contaReceber.controller.js";

export const contaReceberRoutes = Router();

contaReceberRoutes.get("/", listar);
contaReceberRoutes.get("/:id", buscar);

// Somente ADMIN
contaReceberRoutes.post("/", somenteAdmin, cadastrar);
contaReceberRoutes.put("/:id", somenteAdmin, atualizar);
contaReceberRoutes.delete("/:id", somenteAdmin, deletar);
