import { Router } from "express";
import { atualizar, buscar, cadastrar, deletar, listar } from "../controllers/contaReceber.controller.js";

export const contaReceberRoutes = Router();

contaReceberRoutes.post("/", cadastrar)
contaReceberRoutes.get("/", listar)
contaReceberRoutes.get("/:id", buscar)
contaReceberRoutes.put("/:id", atualizar)
contaReceberRoutes.delete("/:id", deletar)