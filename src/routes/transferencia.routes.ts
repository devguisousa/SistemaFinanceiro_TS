import { Router } from "express";
import { somenteAdmin } from "../autenticacao/middlewares/exigirPapel.js";
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

// Estorno: somente ADMIN
transferenciaRoutes.delete("/:id", somenteAdmin, estornar);
