import { Router } from "express";
import { somenteAdmin } from "../middleware/somenteAdmin.middleware.js";
import {
  atualizar,
  buscar,
  cadastrar,
  deletar,
  listar,
} from "../controllers/categoria.controller.js";

export const categoriaRoutes = Router();

categoriaRoutes.get("/", listar);
categoriaRoutes.get("/:id", buscar);

// Somente ADMIN
categoriaRoutes.post("/", somenteAdmin, cadastrar);
categoriaRoutes.put("/:id", somenteAdmin, atualizar);
categoriaRoutes.delete("/:id", somenteAdmin, deletar);
