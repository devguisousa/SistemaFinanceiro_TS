import { Router } from "express";
import {
  alterarSenha,
  login,
  logout,
  perfil,
  refresh,
  registrar,
  sairDeTodosOsDispositivos,
} from "../controllers/auth.controller.js";
import { autenticar } from "../middlewares/autenticar.js";
import { somenteAdmin } from "../middlewares/exigirPapel.js";
import {
  limitadorLoginPorConta,
  limitadorLoginPorIp,
  limitadorRefresh,
  limitadorTrocaSenha,
} from "../middlewares/limitador.js";

export const authRotas = Router();

// Públicas
authRotas.post("/login", limitadorLoginPorIp, limitadorLoginPorConta, login);
authRotas.post("/refresh", limitadorRefresh, refresh);
authRotas.post("/logout", limitadorRefresh, logout);

// Usuário logado
authRotas.get("/me", autenticar, perfil);
authRotas.put("/senha", autenticar, limitadorTrocaSenha, alterarSenha);
authRotas.post("/sair-de-todos", autenticar, sairDeTodosOsDispositivos);

// Somente ADMIN cria usuários
authRotas.post("/registrar", autenticar, somenteAdmin, registrar);
