import { Router } from "express";
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

contaPagarRoutes.post("/", cadastrar);
contaPagarRoutes.put("/:id", atualizar);
contaPagarRoutes.delete("/:id", deletar);
