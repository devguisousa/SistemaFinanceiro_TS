import type { Request, Response } from "express";
import {
  atualizarContaSchema,
  cadastrarContaSchema,
  idContaSchema,
  paginacaoContaSchema,
} from "../schemas/conta.schema.js";
import {
  atualizarConta,
  buscarContas,
  buscarSaldoAtual,
  cadastrarConta,
  deletarConta,
  listarContas,
} from "../services/conta.service.js";
import { responderErro, validar } from "../utils/http.js";

export async function cadastrar(req: Request, res: Response) {
  const dados = validar(res, cadastrarContaSchema, req.body, "DADOS INVÁLIDOS");
  if (!dados) return;

  const conta = await cadastrarConta(dados.nome, dados.saldoInicial);

  res.status(201).json(conta);
}

export async function listar(req: Request, res: Response) {
  const query = validar(
    res,
    paginacaoContaSchema,
    req.query,
    "PARÂMETROS INVÁLIDOS",
  );
  if (!query) return;

  const contas = await listarContas(query.page ?? 1, query.limit ?? 10);

  res.status(200).json(contas);
}

export async function buscar(req: Request, res: Response) {
  const id = validar(res, idContaSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const conta = await buscarContas(id);

  if (!conta) {
    responderErro(res, "CONTA NÃO ENCONTRADA");
    return;
  }

  res.status(200).json(conta);
}

export async function atualizar(req: Request, res: Response) {
  const id = validar(res, idContaSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const dados = validar(res, atualizarContaSchema, req.body, "DADOS INVÁLIDOS");
  if (!dados) return;

  const resultado = await atualizarConta(id, dados.nome, dados.saldoInicial);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(200).json(resultado.conta);
}

export async function deletar(req: Request, res: Response) {
  const id = validar(res, idContaSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const resultado = await deletarConta(id);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(204).send();
}

export async function buscarSaldo(req: Request, res: Response) {
  const id = validar(res, idContaSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const saldo = await buscarSaldoAtual(id);

  if (!saldo) {
    responderErro(res, "CONTA NÃO ENCONTRADA");
    return;
  }

  res.status(200).json(saldo);
}
