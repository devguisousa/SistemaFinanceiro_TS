import type { Request, Response } from "express";
import { responderErro, validar } from "../../utils/http.js";
import {
  alterarPapelSchema,
  idUsuarioSchema,
  paginacaoUsuarioSchema,
} from "../schemas/auth.schema.js";
import {
  alterarPapel,
  apagarUsuario,
  buscarUsuario,
  listarUsuarios,
} from "../services/usuario.service.js";

export async function listar(req: Request, res: Response) {
  const query = validar(
    res,
    paginacaoUsuarioSchema,
    req.query,
    "PARÂMETROS INVÁLIDOS",
  );
  if (!query) return;

  res
    .status(200)
    .json(await listarUsuarios(query.page ?? 1, query.limit ?? 10));
}

export async function buscar(req: Request, res: Response) {
  const id = validar(res, idUsuarioSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const resultado = await buscarUsuario(id);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(200).json(resultado.usuario);
}

export async function mudarPapel(req: Request, res: Response) {
  const id = validar(res, idUsuarioSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const dados = validar(res, alterarPapelSchema, req.body, "DADOS INVÁLIDOS");
  if (!dados) return;

  const resultado = await alterarPapel(id, dados.papel);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(200).json(resultado.usuario);
}

export async function apagar(req: Request, res: Response) {
  const id = validar(res, idUsuarioSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const resultado = await apagarUsuario(id);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(204).send();
}
