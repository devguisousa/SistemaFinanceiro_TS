import { Router } from "express";
import { atualizar, buscar, cadastrar, deletar, listar } from "../controllers/contaPagar.controller.js";

export const  contaPagarRoutes = Router();

contaPagarRoutes.post("/", cadastrar)
contaPagarRoutes.get("/", listar)
contaPagarRoutes.get("/:id", buscar)
contaPagarRoutes.put("/:id", atualizar)
contaPagarRoutes.delete("/:id", deletar)