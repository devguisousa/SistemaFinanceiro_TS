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
  resumo,
} from "../controllers/transacao.controller.js";

export const transacaoRoutes = Router();

transacaoRoutes.get("/", listar);
// Antes de "/:id", senão "resumo" seria lido como id
transacaoRoutes.get("/resumo", resumo);
transacaoRoutes.get("/:id", buscar);
transacaoRoutes.get("/receitas/:id", buscarReceita);
transacaoRoutes.get("/despesas/:id", buscarDespesa);
transacaoRoutes.get("/:id/receitas", listarReceitasPorConta);
transacaoRoutes.get("/:id/despesas", listarDespesasPorConta);

// Lançamento: qualquer usuário logado
transacaoRoutes.post("/", cadastrar);

transacaoRoutes.put("/:id", atualizar);
transacaoRoutes.delete("/:id", deletar);
