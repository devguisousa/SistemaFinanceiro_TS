
import { Router } from "express";

import {
  cadastrar,
  listar,
  buscar,
  atualizar,
  deletar,
} from "../controllers/categoria.controller.js";

export const categoriaRoutes = Router();

categoriaRoutes.post("/", cadastrar);
categoriaRoutes.get("/", listar);
categoriaRoutes.get("/:id", buscar);
categoriaRoutes.put("/:id", atualizar);
categoriaRoutes.delete("/:id", deletar);
