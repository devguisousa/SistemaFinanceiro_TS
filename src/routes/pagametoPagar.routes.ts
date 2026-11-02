import { Router } from "express";
import { buscarPagamento, listarPagamento, listarPagamentoContaPagar, registrarPagamento } from "../controllers/pagamento.controller.js";

export const pagamentoPagarRoutes = Router();

pagamentoPagarRoutes.post("/", registrarPagamento)
pagamentoPagarRoutes.get("/pagamentoConta", listarPagamentoContaPagar)
pagamentoPagarRoutes.get("/ ", listarPagamento)
pagamentoPagarRoutes.get("/:id", buscarPagamento)
