import type { Request, Response } from "express";
import {
  idPagamentoSchema,
  paginacaoPagamentoSchema,
  registrarPagamentoSchema,
} from "../schemas/pagamentoPagar.schema.js";
import {
  buscarPagamento as buscarPagamentoService,
  listarPagamentoContaPagar as listarPagamentoContaPagarService,
  listarPagamento as listarPagamentoService,
  registrarPagamento as registrarPagamentoService,
} from "../services/pagamentoPagar.service.js";
import { responderErro, validar } from "../utils/http.js";

export async function registrarPagamento(req: Request, res: Response) {
  const params = validar(res, idPagamentoSchema, req.params, "ID INVÁLIDO");
  if (!params) return;

  const dados = validar(
    res,
    registrarPagamentoSchema,
    req.body,
    "DADOS INVÁLIDOS",
  );
  if (!dados) return;

  const resultado = await registrarPagamentoService({
    contaPagarId: params.id,
    ...dados,
  });

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(201).json(resultado);
}

export async function listarPagamento(req: Request, res: Response) {
  const query = validar(
    res,
    paginacaoPagamentoSchema,
    req.query,
    "PARÂMETROS INVÁLIDOS",
  );
  if (!query) return;

  res
    .status(200)
    .json(await listarPagamentoService(query.pagina, query.limite));
}

export async function buscarPagamento(req: Request, res: Response) {
  const params = validar(res, idPagamentoSchema, req.params, "ID INVÁLIDO");
  if (!params) return;

  const resultado = await buscarPagamentoService(params.id);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(200).json(resultado);
}

export async function listarPagamentoContaPagar(req: Request, res: Response) {
  const params = validar(res, idPagamentoSchema, req.params, "ID INVÁLIDO");
  if (!params) return;

  const query = validar(
    res,
    paginacaoPagamentoSchema,
    req.query,
    "PARÂMETROS INVÁLIDOS",
  );
  if (!query) return;

  const resultado = await listarPagamentoContaPagarService(
    params.id,
    query.pagina,
    query.limite,
  );

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(200).json(resultado);
}
