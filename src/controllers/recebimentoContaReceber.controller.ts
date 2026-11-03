import type { Request, Response } from "express";
import {
  idRecebimentoSchema,
  paginacaoRecebimentoSchema,
  recebimentoSchema,
} from "../schemas/recebimentoContaReceber.schema.js";
import {
  buscarRecebimento,
  cadastrarRecebimento,
  listarRecebimentos,
  listarRecebimentosPorContaReceber,
} from "../services/recebimentoContaReceber.service.js";
import { responderErro, validar } from "../utils/http.js";

// POST /contaReceber/:id/recebimentos
export async function cadastrar(req: Request, res: Response) {
  const params = validar(res, idRecebimentoSchema, req.params, "ID INVÁLIDO");
  if (!params) return;

  const dados = validar(res, recebimentoSchema, req.body, "DADOS INVÁLIDOS");
  if (!dados) return;

  const resultado = await cadastrarRecebimento({
    contaReceberId: params.id,
    ...dados,
  });

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(201).json(resultado);
}

// GET /recebimentos
export async function listar(req: Request, res: Response) {
  const query = validar(
    res,
    paginacaoRecebimentoSchema,
    req.query,
    "PARÂMETROS INVÁLIDOS",
  );
  if (!query) return;

  res.status(200).json(await listarRecebimentos(query.pagina, query.limite));
}

// GET /recebimentos/:id
export async function buscar(req: Request, res: Response) {
  const params = validar(res, idRecebimentoSchema, req.params, "ID INVÁLIDO");
  if (!params) return;

  const resultado = await buscarRecebimento(params.id);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(200).json(resultado.recebimento);
}

// GET /contaReceber/:id/recebimentos
export async function listarPorContaReceber(req: Request, res: Response) {
  const params = validar(res, idRecebimentoSchema, req.params, "ID INVÁLIDO");
  if (!params) return;

  const query = validar(
    res,
    paginacaoRecebimentoSchema,
    req.query,
    "PARÂMETROS INVÁLIDOS",
  );
  if (!query) return;

  const resultado = await listarRecebimentosPorContaReceber(
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
