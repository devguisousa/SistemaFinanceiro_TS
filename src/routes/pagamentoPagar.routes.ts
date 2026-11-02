import { Router } from "express";
import {
  buscarPagamento,
  listarPagamento,
  listarPagamentoContaPagar,
  registrarPagamento,
} from "../controllers/pagamentoPagar.controller.js";

export const pagamentoPagarRoutes = Router();

pagamentoPagarRoutes.post("/contaPagar/:id", registrarPagamento);
pagamentoPagarRoutes.get("/contaPagar/:id", listarPagamentoContaPagar);
pagamentoPagarRoutes.get("/", listarPagamento);
pagamentoPagarRoutes.get("/:id", buscarPagamento);
