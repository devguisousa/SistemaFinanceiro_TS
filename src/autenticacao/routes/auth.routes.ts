import { Router } from "express";
import {
  login,
  logout,
  refresh,
  registrar,
} from "../controllers/auth.controller.js";
import { limitadorAuth, limitadorRefresh } from "../middlewares/limitador.js";

export const authRotas = Router();

authRotas.post("/registrar", limitadorAuth, registrar);
authRotas.post("/login", limitadorAuth, login);
authRotas.post("/refresh", limitadorRefresh, refresh);
authRotas.post("/logout", logout);
