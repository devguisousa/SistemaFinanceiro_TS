import { Router } from "express";
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

categoriaRoutes.post("/", cadastrar);
categoriaRoutes.put("/:id", atualizar);
categoriaRoutes.delete("/:id", deletar);
