import { Router } from "express";
import {
  apagar,
  buscar,
  listar,
  mudarPapel,
} from "../controllers/usuario.controller.js";
import { somenteAdmin } from "../middlewares/exigirPapel.js";

// Gestão de usuários: tudo somente ADMIN
export const usuarioRotas = Router();

usuarioRotas.use(somenteAdmin);

usuarioRotas.get("/", listar);
usuarioRotas.get("/:id", buscar);
usuarioRotas.patch("/:id/papel", mudarPapel);
usuarioRotas.delete("/:id", apagar);
