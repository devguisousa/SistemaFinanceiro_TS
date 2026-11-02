import { Router } from "express";
import {
  atualizar,
  buscar,
  buscarDespesa,
  buscarReceita,
  cadastrar,
  deletar,
  listar,
  listarDespesasPorConta,
  listarReceitasPorConta,
} from "../controllers/transacao.controller.js";

export const transacaoRoutes = Router();

transacaoRoutes.post("/", cadastrar);
transacaoRoutes.get("/", listar);
transacaoRoutes.get("/:id", buscar);
transacaoRoutes.put("/:id", atualizar);
transacaoRoutes.delete("/:id", deletar);
transacaoRoutes.get("/receitas/:id", buscarReceita);
transacaoRoutes.get("/despesas/:id", buscarDespesa);
transacaoRoutes.get("/:id/receitas", listarReceitasPorConta);
transacaoRoutes.get("/:id/despesas", listarDespesasPorConta);


