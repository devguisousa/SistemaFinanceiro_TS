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

export async function cadastrar(req: Request, res: Response) {
  const resultado = transacaoSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const transacao = await cadastrarTransacao(resultado.data);

  if ("erro" in transacao) {
    // Conta ou categoria não encontrada
    const status = transacao.erro.includes("NÃO ENCONTRADA") ? 404 : 409;
    res.status(status).json({ erro: transacao.erro });
    return;
  }

  res.status(201).json(transacao.transacao);
}

export async function listar(req: Request, res: Response) {
  const resultado = filtroTransacaoSchema.safeParse(req.query);

  if (!resultado.success) {
    res.status(400).json({
      erro: "PARÂMETROS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const filtros = resultado.data;

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
  const resultado = idTransacaoSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const transacao = await buscarTransacao(resultado.data);

  if ("erro" in transacao) {
    res.status(404).json({ erro: transacao.erro });
    return;
  }

  res.status(200).json(transacao.transacao);
}

export async function atualizar(req: Request, res: Response) {
  const resultadoId = idTransacaoSchema.safeParse(req.params.id);

  if (!resultadoId.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultadoId.error.issues,
    });
    return;
  }

  const resultado = transacaoSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const transacao = await atualizarTransacao(resultado.data, resultadoId.data);

  if ("erro" in transacao) {
    // Transação, conta ou categoria não encontrada
    const status = transacao.erro.includes("NÃO ENCONTRADA") ? 404 : 409;
    res.status(status).json({ erro: transacao.erro });
    return;
  }

  res.status(200).json(transacao.transacao);
}

export async function deletar(req: Request, res: Response) {
  const resultado = idTransacaoSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const deletado = await deletarTransacao(resultado.data);

  if ("erro" in deletado) {
    const status = deletado.erro === "TRANSAÇÃO NÃO ENCONTRADA" ? 404 : 409;
    res.status(status).json({ erro: deletado.erro });
    return;
  }

  res.status(204).send();
}

export async function buscarReceita(req: Request, res: Response) {
  const resultado = idTransacaoSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const receita = await buscarReceitaPorId(resultado.data);

  if ("erro" in receita) {
    res.status(404).json({ erro: receita.erro });
    return;
  }

  res.status(200).json(receita.transacao);
}

export async function buscarDespesa(req: Request, res: Response) {
  const resultado = idTransacaoSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const despesa = await buscarDespesaPorId(resultado.data);

  if ("erro" in despesa) {
    res.status(404).json({ erro: despesa.erro });
    return;
  }

  res.status(200).json(despesa.transacao);
}

// GET /transacao/:id/receitas (id da conta)
export async function listarReceitasPorConta(req: Request, res: Response) {
  const resultadoId = idContaSchema.safeParse(req.params.id);

  if (!resultadoId.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultadoId.error.issues,
    });
    return;
  }

  const resultado = paginacaoTransacaoSchema.safeParse(req.query);

  if (!resultado.success) {
    res.status(400).json({
      erro: "PARÂMETROS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const conta = await buscarContas(resultadoId.data);

  if (!conta) {
    res.status(404).json({ erro: "CONTA NÃO ENCONTRADA" });
    return;
  }

  const pagina = resultado.data.page ?? 1;
  const limite = resultado.data.limit ?? 10;

  const receitas = await listarReceita(conta.id, pagina, limite);

  res.status(200).json(receitas);
}

// GET /transacao/:id/despesas (id da conta)
export async function listarDespesasPorConta(req: Request, res: Response) {
  const resultadoId = idContaSchema.safeParse(req.params.id);

  if (!resultadoId.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultadoId.error.issues,
    });
    return;
  }

  const resultado = paginacaoTransacaoSchema.safeParse(req.query);

  if (!resultado.success) {
    res.status(400).json({
      erro: "PARÂMETROS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const conta = await buscarContas(resultadoId.data);

  if (!conta) {
    res.status(404).json({ erro: "CONTA NÃO ENCONTRADA" });
    return;
  }

  const pagina = resultado.data.page ?? 1;
  const limite = resultado.data.limit ?? 10;

  const despesas = await listarDespesa(conta.id, pagina, limite);

  res.status(200).json(despesas);
}
