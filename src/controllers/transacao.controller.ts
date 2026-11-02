import type { Request, Response } from "express";
import {
    filtroTransacaoSchema,
  idTransacaoSchema,
  transacaoSchema,
} from "../schemas/transacao.schema.js";
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
import { buscarContas } from "../services/conta.service.js";
import { idContaSchema } from "../schemas/conta.schema.js";

export async function cadastrar(req: Request, res: Response) {
  const resultado = transacaoSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erros: resultado.error.issues,
    });

    return;
  }

  const transacao = await cadastrarTransacao(resultado.data);

  if ("erro" in transacao) {
    res.status(404).json({
      erro: transacao.erro,
    });

    return;
  }

  res.status(201).json(transacao.transacao);
}

export async function listar(req: Request, res: Response) {
    const resultado = filtroTransacaoSchema.safeParse(req.query)
    
    if (!resultado.success) {
    res.status(400).json({
      erros: resultado.error.issues,
    });
    return;
  }

  const filtros = resultado.data

  const transacao = await listarTransacoes(filtros.tipo, filtros.contaId, filtros.page ?? 1, filtros.limit ?? 10)

  res.status(200).json(transacao);
}

export async function buscar(req: Request, res: Response) {
  const resultado = idTransacaoSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erros: resultado.error.issues,
    });

    return;
  }

  const id = resultado.data;

  const transacao = await buscarTransacao(id);

  if ("erro" in transacao) {
    res.status(404).json({
      erro: transacao.erro,
    });

    return;
  }

  res.status(200).json(transacao.transacao);
}

export async function atualizar(req: Request, res: Response) {
  const resultado = idTransacaoSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erros: resultado.error.issues,
    });

    return;
  }

  const outroResultado = transacaoSchema.safeParse(req.body);
  if (!outroResultado.success) {
    res.status(400).json({
      erros: outroResultado.error.issues,
    });

    return;
  }

  const transacao = await atualizarTransacao(
    outroResultado.data,
    resultado.data,
  );

  if ("erro" in transacao) {
    res.status(404).json({
      erro: transacao.erro,
    });

    return;
  }

  res.status(200).json(transacao.transacao);
}

export async function deletar(req: Request, res: Response) {
  const resultado = idTransacaoSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erros: resultado.error.issues,
    });

    return;
  }
  const deletado = await deletarTransacao(resultado.data);

  if ("erro" in deletado) {
    res.status(404).json({
      erro: deletado.erro,
    });

    return;
  }

  res.status(204).send();
}

export async function buscarReceita(req: Request, res: Response) {
  const resultado = idTransacaoSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erros: resultado.error.issues,
    });
    return;
  }

  const receita = await buscarReceitaPorId(resultado.data);

  if ("erro" in receita) {
    res.status(404).json({
      erro: receita.erro,
    });
    return;
  }

  res.status(200).json(receita.transacao);
}

export async function buscarDespesa(req: Request, res: Response) {
  const resultado = idTransacaoSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erros: resultado.error.issues,
    });
    return;
  }

  const despesa = await buscarDespesaPorId(resultado.data);

  if ("erro" in despesa) {
    res.status(404).json({
      erro: despesa.erro,
    });
    return;
  }

  res.status(200).json(despesa.transacao);
}

export async function listarReceitasPorConta(req: Request, res: Response) {
  const resultado = idContaSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erros: resultado.error.issues,
    });
    return;
  }


  const conta = await buscarContas(resultado.data);

  if (!conta) {
    res.status(404).json({
      erro: "Conta não encontrada",
    });
    return;
  }

  const receitas = await listarReceita(resultado.data);

  res.status(200).json(receitas);
}

export async function listarDespesasPorConta(req: Request, res: Response) {
  const resultado = idContaSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erros: resultado.error.issues,
    });
    return;
  }

  const id = resultado.data;

  const conta = await buscarContas(id);

  if (!conta) {
    res.status(404).json({
      erro: "Conta não encontrada",
    });
    return;
  }

  const despesas = await listarDespesa(id);

  res.status(200).json(despesas);
}
