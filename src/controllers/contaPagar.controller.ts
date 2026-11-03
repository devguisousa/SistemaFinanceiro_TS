import type { Request, Response } from "express";
import {
  atualizarContaPagarSchema,
  cadastrarContaPagarSchema,
  filtroContaPagarSchema,
  idContaPagarSchema,
} from "../schemas/contaPagar.schema.js";
import {
  atualizarContaPagar,
  buscarContaPagar,
  cadastrarContaPagar,
  deletarContaPagar,
  listarContaPagar,
} from "../services/contaPagar.service.js";
import { responderErro, validar } from "../utils/http.js";

export async function cadastrar(req: Request, res: Response) {
  const dados = validar(
    res,
    cadastrarContaPagarSchema,
    req.body,
    "DADOS INVÁLIDOS",
  );
  if (!dados) return;

  const resultado = await cadastrarContaPagar(dados);

  res.status(201).json(resultado.contaPagar);
}

export async function listar(req: Request, res: Response) {
  const filtro = validar(
    res,
    filtroContaPagarSchema,
    req.query,
    "PARÂMETROS INVÁLIDOS",
  );
  if (!filtro) return;

  const contasPagar = await listarContaPagar({
    status: filtro.status,
    vencidas: filtro.vencidas,
    pagina: filtro.page,
    limite: filtro.limit,
  });

  res.status(200).json(contasPagar);
}

export async function buscar(req: Request, res: Response) {
  const id = validar(res, idContaPagarSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const resultado = await buscarContaPagar(id);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(200).json(resultado.contaPagar);
}

export async function atualizar(req: Request, res: Response) {
  const id = validar(res, idContaPagarSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const dados = validar(
    res,
    atualizarContaPagarSchema,
    req.body,
    "DADOS INVÁLIDOS",
  );
  if (!dados) return;

  const resultado = await atualizarContaPagar(id, dados);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(200).json(resultado.contaPagar);
}

export async function deletar(req: Request, res: Response) {
  const id = validar(res, idContaPagarSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const resultado = await deletarContaPagar(id);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(204).send();
}
