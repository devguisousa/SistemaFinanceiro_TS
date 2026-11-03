import type { Request, Response } from "express";
import { idContaSchema } from "../schemas/conta.schema.js";
import {
  filtroTransacaoSchema,
  idTransacaoSchema,
  paginacaoTransacaoSchema,
  transacaoSchema,
} from "../schemas/transacao.schema.js";
import { buscarContas } from "../services/conta.service.js";
import {
  atualizarTransacao,
  buscarDespesaPorId,
  buscarReceitaPorId,
  buscarTransacao,
  cadastrarTransacao,
  deletarTransacao,
  listarDespesa,
  listarReceita,
  listarTransacoes,
} from "../services/transacao.service.js";
import { responderErro, validar } from "../utils/http.js";

export async function cadastrar(req: Request, res: Response) {
  const dados = validar(res, transacaoSchema, req.body, "DADOS INVÁLIDOS");
  if (!dados) return;

  const resultado = await cadastrarTransacao(dados);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(201).json(resultado.transacao);
}

export async function listar(req: Request, res: Response) {
  const filtros = validar(
    res,
    filtroTransacaoSchema,
    req.query,
    "PARÂMETROS INVÁLIDOS",
  );
  if (!filtros) return;

  const transacoes = await listarTransacoes({
    tipo: filtros.tipo,
    contaId: filtros.contaId,
    categoriaId: filtros.categoriaId,
    pagina: filtros.page ?? 1,
    limite: filtros.limit ?? 10,
  });

  res.status(200).json(transacoes);
}

export async function buscar(req: Request, res: Response) {
  const id = validar(res, idTransacaoSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const resultado = await buscarTransacao(id);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(200).json(resultado.transacao);
}

export async function atualizar(req: Request, res: Response) {
  const id = validar(res, idTransacaoSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const dados = validar(res, transacaoSchema, req.body, "DADOS INVÁLIDOS");
  if (!dados) return;

  const resultado = await atualizarTransacao(dados, id);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(200).json(resultado.transacao);
}

export async function deletar(req: Request, res: Response) {
  const id = validar(res, idTransacaoSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const resultado = await deletarTransacao(id);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(204).send();
}

export async function buscarReceita(req: Request, res: Response) {
  const id = validar(res, idTransacaoSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const resultado = await buscarReceitaPorId(id);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(200).json(resultado.transacao);
}

export async function buscarDespesa(req: Request, res: Response) {
  const id = validar(res, idTransacaoSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const resultado = await buscarDespesaPorId(id);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(200).json(resultado.transacao);
}

async function listarPorConta(
  req: Request,
  res: Response,
  listar: typeof listarReceita,
) {
  const id = validar(res, idContaSchema, req.params.id, "ID INVÁLIDO");
  if (id === null) return;

  const query = validar(
    res,
    paginacaoTransacaoSchema,
    req.query,
    "PARÂMETROS INVÁLIDOS",
  );
  if (!query) return;

  if (!(await buscarContas(id))) {
    responderErro(res, "CONTA NÃO ENCONTRADA");
    return;
  }

  res.status(200).json(await listar(id, query.page ?? 1, query.limit ?? 10));
}

export async function listarReceitasPorConta(req: Request, res: Response) {
  await listarPorConta(req, res, listarReceita);
}

export async function listarDespesasPorConta(req: Request, res: Response) {
  await listarPorConta(req, res, listarDespesa);
}
