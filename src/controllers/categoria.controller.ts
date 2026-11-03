import type { Request, Response } from "express";
import {
  categoriaSchema,
  idCategoriaSchema,
  paginacaoCategoriaSchema,
} from "../schemas/categoria.schema.js";
import {
  atualizarCategoria,
  buscarCategoria,
  cadastrarCategoria,
  deletarCategoria,
  listarCategoria,
} from "../services/categoria.service.js";
import { responderErro, validar } from "../utils/http.js";

export async function cadastrar(req: Request, res: Response) {
  const dados = validar(res, categoriaSchema, req.body, "DADOS INVÁLIDOS");
  if (!dados) return;

  const resultado = await cadastrarCategoria(dados);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(201).json(resultado.categoria);
}

export async function listar(req: Request, res: Response) {
  const query = validar(
    res,
    paginacaoCategoriaSchema,
    req.query,
    "PARÂMETROS INVÁLIDOS",
  );
  if (!query) return;

  const categorias = await listarCategoria(
    query.page ?? 1,
    query.limit ?? 10,
    query.tipo,
  );

  res.status(200).json(categorias);
}

export async function buscar(req: Request, res: Response) {
  const id = validar(res, idCategoriaSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const resultado = await buscarCategoria(id);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(200).json(resultado.categoria);
}

export async function atualizar(req: Request, res: Response) {
  const id = validar(res, idCategoriaSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const dados = validar(res, categoriaSchema, req.body, "DADOS INVÁLIDOS");
  if (!dados) return;

  const resultado = await atualizarCategoria(id, dados);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(200).json(resultado.categoria);
}

export async function deletar(req: Request, res: Response) {
  const id = validar(res, idCategoriaSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const resultado = await deletarCategoria(id);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(204).send();
}
