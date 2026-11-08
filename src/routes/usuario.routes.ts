import { Router } from "express";
import {
  apagar,
  buscar,
  listar,
  mudarPapel,
} from "../controllers/usuario.controller.js";
import { somenteAdmin } from "../middleware/somenteAdmin.middleware.js";

export const usuarioRoutes = Router();

// Tudo aqui é somente ADMIN
usuarioRoutes.use(somenteAdmin);

usuarioRoutes.get("/", listar);
usuarioRoutes.get("/:id", buscar);
usuarioRoutes.patch("/:id/papel", mudarPapel);
usuarioRoutes.delete("/:id", apagar);
