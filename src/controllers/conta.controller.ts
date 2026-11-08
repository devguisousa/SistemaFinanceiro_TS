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
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const { nome, saldoInicial } = resultado.data;

  const conta = await cadastrarConta(req.usuario!.id, nome, saldoInicial);

  res.status(201).json(conta);
}

export async function listar(req: Request, res: Response) {
  const resultado = paginacaoContaSchema.safeParse(req.query);

  if (!resultado.success) {
    res.status(400).json({
      erro: "PARÂMETROS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const pagina = resultado.data.page ?? 1;
  const limite = resultado.data.limit ?? 10;

  const contas = await listarContas(req.usuario!.id, pagina, limite);

  res.status(200).json(contas);
}

export async function buscar(req: Request, res: Response) {
  const resultado = idContaSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const conta = await buscarContas(req.usuario!.id, resultado.data);

  if (!conta) {
    res.status(404).json({ erro: "CONTA NÃO ENCONTRADA" });
    return;
  }

  res.status(200).json(conta);
}

export async function atualizar(req: Request, res: Response) {
  const resultadoId = idContaSchema.safeParse(req.params.id);

  if (!resultadoId.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultadoId.error.issues,
    });
    return;
  }

  const resultado = atualizarContaSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const { nome, saldoInicial } = resultado.data;

  const conta = await atualizarConta(
    req.usuario!.id,
    resultadoId.data,
    nome,
    saldoInicial,
  );

  if ("erro" in conta) {
    const status = conta.erro === "CONTA NÃO ENCONTRADA" ? 404 : 409;
    res.status(status).json({ erro: conta.erro });
    return;
  }

  res.status(200).json(conta.conta);
}

export async function deletar(req: Request, res: Response) {
  const resultado = idContaSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const deletado = await deletarConta(req.usuario!.id, resultado.data);

  if ("erro" in deletado) {
    const status = deletado.erro === "CONTA NÃO ENCONTRADA" ? 404 : 409;
    res.status(status).json({ erro: deletado.erro });
    return;
  }

  res.status(204).send();
}

export async function buscarSaldo(req: Request, res: Response) {
  const resultado = idContaSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const saldo = await buscarSaldoAtual(req.usuario!.id, resultado.data);

  if (!saldo) {
    res.status(404).json({ erro: "CONTA NÃO ENCONTRADA" });
    return;
  }

  res.status(200).json(saldo);
}
