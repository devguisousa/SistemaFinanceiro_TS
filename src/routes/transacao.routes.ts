import { Router } from "express";
import { somenteAdmin } from "../autenticacao/middlewares/exigirPapel.js";
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

transacaoRoutes.get("/", listar);
transacaoRoutes.get("/:id", buscar);
transacaoRoutes.get("/receitas/:id", buscarReceita);
transacaoRoutes.get("/despesas/:id", buscarDespesa);
transacaoRoutes.get("/:id/receitas", listarReceitasPorConta);
transacaoRoutes.get("/:id/despesas", listarDespesasPorConta);

// Lançamento: qualquer usuário logado
transacaoRoutes.post("/", cadastrar);

// Somente ADMIN
transacaoRoutes.put("/:id", somenteAdmin, atualizar);
transacaoRoutes.delete("/:id", somenteAdmin, deletar);
