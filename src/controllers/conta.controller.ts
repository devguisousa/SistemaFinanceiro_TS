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

export async function cadastrar(req: Request, res: Response) {
  const resultado = cadastrarContaSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erros: resultado.error.issues,
    });
    return;
  }

  const { nome, saldoInicial } = resultado.data;

  const conta = await cadastrarConta(nome, saldoInicial);
  res.status(201).json(conta);
}

export async function listar(req: Request, res: Response) {
  const resultado = paginacaoContaSchema.safeParse(req.query)
   if (!resultado.success) {
    res.status(400).json({
      erros: resultado.error.issues,
    });
    return;
  }

  const pagina = resultado.data.page ?? 1;
  const limite = resultado.data.limit ?? 10;

  const contas = await listarContas(pagina, limite);

  res.status(200).json(contas);
}

export async function buscar(req: Request, res: Response) {
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
      erro: "conta não encontrada",
    });

    return;
  }

  res.status(200).json(conta);
}

export async function atualizar(req: Request, res: Response) {
  const resultado = idContaSchema.safeParse(req.params.id);
  if (!resultado.success) {
    res.status(400).json({
      erros: resultado.error.issues,
    });
    return;
  }

  const outroResultado = atualizarContaSchema.safeParse(req.body);

  if (!outroResultado.success) {
    res.status(400).json({
      erros: outroResultado.error.issues,
    });
    return;
  }

  const id = resultado.data;

  const { nome, saldoInicial } = outroResultado.data;

  const contaAtualizada = await atualizarConta(id, nome, saldoInicial);

  if (!contaAtualizada) {
    res.status(404).json({
      erro: "Conta não encontrada",
    });
    return;
  }

  res.status(200).json(contaAtualizada);
}

export async function deletar(req: Request, res: Response) {
  const resultado = idContaSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erros: resultado.error.issues,
    });

    return;
  }
  const id = resultado.data;

  const conta = await deletarConta(id);

  if (!conta) {
    res.status(404).json({
      erro: "conta não encontrada",
    });

    return;
  }

  res.status(204).send();
}

export async function buscarSaldo(req: Request, res: Response) {
  const resultado = idContaSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erros: resultado.error.issues,
    });
    return;
  }

  const saldo = await buscarSaldoAtual(resultado.data);

  if (!saldo) {
    res.status(404).json({
      erro: "Conta não encontrada",
    });
    return;
  }

  res.status(200).json(saldo);
}

