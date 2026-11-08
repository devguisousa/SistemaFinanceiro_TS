import { Router } from "express";
import { somenteAdmin } from "../middleware/somenteAdmin.middleware.js";
import {
  buscar,
  cadastrar,
  estornar,
  listar,
} from "../controllers/transferencia.controller.js";

export const transferenciaRoutes = Router();

transferenciaRoutes.get("/", listar);
transferenciaRoutes.get("/:id", buscar);

// Lançamento: qualquer usuário logado
transferenciaRoutes.post("/", cadastrar);

// Somente ADMIN (estorno)
transferenciaRoutes.delete("/:id", somenteAdmin, estornar);
