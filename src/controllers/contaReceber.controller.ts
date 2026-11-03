import type { Request, Response } from "express";
import {
  contaReceberSchema,
  idContaReceberSchema,
  paginacaoContaReceberSchema,
} from "../schemas/contaReceber.schema.js";
import {
  atualizarContaReceber,
  buscarContaReceber,
  cadastrarContaReceber,
  deletarContaReceber,
  listarContaReceber,
} from "../services/contaReceber.service.js";
import { responderErro, validar } from "../utils/http.js";

export async function cadastrar(req: Request, res: Response) {
  const dados = validar(res, contaReceberSchema, req.body, "DADOS INVÁLIDOS");
  if (!dados) return;

  const resultado = await cadastrarContaReceber(dados);

  res.status(201).json(resultado.contaReceber);
}

export async function listar(req: Request, res: Response) {
  const query = validar(
    res,
    paginacaoContaReceberSchema,
    req.query,
    "PARÂMETROS INVÁLIDOS",
  );
  if (!query) return;

  const contasReceber = await listarContaReceber(query);

  res.status(200).json(contasReceber);
}

export async function buscar(req: Request, res: Response) {
  const params = validar(res, idContaReceberSchema, req.params, "ID INVÁLIDO");
  if (!params) return;

  const resultado = await buscarContaReceber(params.id);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(200).json(resultado.contaReceber);
}

export async function atualizar(req: Request, res: Response) {
  const params = validar(res, idContaReceberSchema, req.params, "ID INVÁLIDO");
  if (!params) return;

  const dados = validar(res, contaReceberSchema, req.body, "DADOS INVÁLIDOS");
  if (!dados) return;

  const resultado = await atualizarContaReceber(params.id, dados);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(200).json(resultado.contaReceber);
}

export async function deletar(req: Request, res: Response) {
  const params = validar(res, idContaReceberSchema, req.params, "ID INVÁLIDO");
  if (!params) return;

  const resultado = await deletarContaReceber(params.id);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(204).send();
}
