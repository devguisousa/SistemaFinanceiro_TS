import type { Request, Response } from "express";
import {
  idTransferenciaSchema,
  paginacaoTransferenciaSchema,
  transferenciaSchema,
} from "../schemas/transferencia.schema.js";
import {
  buscarTransferencia,
  estornarTransferencia,
  listarTransferencias,
  transferir,
} from "../services/transferencia.service.js";
import { responderErro, validar } from "../utils/http.js";

export async function cadastrar(req: Request, res: Response) {
  const dados = validar(res, transferenciaSchema, req.body, "DADOS INVÁLIDOS");
  if (!dados) return;

  const resultado = await transferir(dados);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(201).json(resultado.transferencia);
}

export async function listar(req: Request, res: Response) {
  const query = validar(
    res,
    paginacaoTransferenciaSchema,
    req.query,
    "PARÂMETROS INVÁLIDOS",
  );
  if (!query) return;

  res
    .status(200)
    .json(await listarTransferencias(query.page ?? 1, query.limit ?? 10));
}

export async function buscar(req: Request, res: Response) {
  const id = validar(res, idTransferenciaSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const resultado = await buscarTransferencia(id);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(200).json(resultado.transferencia);
}

export async function estornar(req: Request, res: Response) {
  const id = validar(res, idTransferenciaSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const resultado = await estornarTransferencia(id);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(204).send();
}
