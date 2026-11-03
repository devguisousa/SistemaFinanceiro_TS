import { Router } from "express";
import {
  buscarPagamento,
  listarPagamento,
  listarPagamentoContaPagar,
  registrarPagamento,
} from "../controllers/pagamentoPagar.controller.js";

export const pagamentoPagarRoutes = Router();

pagamentoPagarRoutes.get("/", listarPagamento);
pagamentoPagarRoutes.get("/:id", buscarPagamento);
pagamentoPagarRoutes.get("/contaPagar/:id", listarPagamentoContaPagar);

// Lançamento: qualquer usuário logado
pagamentoPagarRoutes.post("/contaPagar/:id", registrarPagamento);
