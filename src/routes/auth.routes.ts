import { Router } from "express";
import {
  alterarSenha,
  cadastrar,
  login,
  logout,
  perfil,
  primeiroAdmin,
  refresh,
  registrar,
  sairDeTodosOsDispositivos,
  status,
} from "../controllers/auth.controller.js";
import { autenticar } from "../middleware/autenticar.middleware.js";
import {
  limitadorLoginPorConta,
  limitadorLoginPorIp,
  limitadorRefresh,
  limitadorTrocaSenha,
} from "../middleware/limitador.middleware.js";
import { somenteAdmin } from "../middleware/somenteAdmin.middleware.js";

export const authRoutes = Router();

// Públicas
authRoutes.post("/login", limitadorLoginPorIp, limitadorLoginPorConta, login);
authRoutes.post("/refresh", limitadorRefresh, refresh);
authRoutes.post("/logout", limitadorRefresh, logout);

// Cadastro aberto: cria um USUARIO com dados próprios
authRoutes.post("/cadastro", limitadorLoginPorIp, cadastrar);

// Primeiro acesso: cria o ADMIN quando o banco ainda não tem nenhum
authRoutes.get("/status", status);
authRoutes.post("/primeiro-admin", limitadorLoginPorIp, primeiroAdmin);

// Usuário logado
authRoutes.get("/me", autenticar, perfil);
authRoutes.put("/senha", autenticar, limitadorTrocaSenha, alterarSenha);
authRoutes.post("/sair-de-todos", autenticar, sairDeTodosOsDispositivos);

// Somente ADMIN cria usuários
authRoutes.post("/registrar", autenticar, somenteAdmin, registrar);
