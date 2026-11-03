import { Router } from "express";
import { somenteAdmin } from "../autenticacao/middlewares/exigirPapel.js";
import {
  atualizar,
  buscar,
  cadastrar,
  deletar,
  listar,
} from "../controllers/contaPagar.controller.js";

export const contaPagarRoutes = Router();

contaPagarRoutes.get("/", listar);
contaPagarRoutes.get("/:id", buscar);

// Somente ADMIN
contaPagarRoutes.post("/", somenteAdmin, cadastrar);
contaPagarRoutes.put("/:id", somenteAdmin, atualizar);
contaPagarRoutes.delete("/:id", somenteAdmin, deletar);
