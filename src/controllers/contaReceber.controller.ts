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

export async function cadastrar(req: Request, res: Response) {
  const resultado = contaReceberSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const contaReceber = await cadastrarContaReceber(resultado.data);

  res.status(201).json(contaReceber.contaReceber);
}

export async function listar(req: Request, res: Response) {
  const resultado = paginacaoContaReceberSchema.safeParse(req.query);

  if (!resultado.success) {
    res.status(400).json({
      erro: "PARÂMETROS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const contasReceber = await listarContaReceber(resultado.data);

  res.status(200).json(contasReceber);
}

export async function buscar(req: Request, res: Response) {
  const resultado = idContaReceberSchema.safeParse(req.params);

  if (!resultado.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const contaReceber = await buscarContaReceber(resultado.data.id);

  if ("erro" in contaReceber) {
    res.status(404).json({ erro: contaReceber.erro });
    return;
  }

  res.status(200).json(contaReceber.contaReceber);
}

export async function atualizar(req: Request, res: Response) {
  const resultadoId = idContaReceberSchema.safeParse(req.params);

  if (!resultadoId.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultadoId.error.issues,
    });
    return;
  }

  const resultado = contaReceberSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const contaReceber = await atualizarContaReceber(
    resultadoId.data.id,
    resultado.data,
  );

  if ("erro" in contaReceber) {
    const status =
      contaReceber.erro === "CONTA A RECEBER NÃO ENCONTRADA" ? 404 : 409;
    res.status(status).json({ erro: contaReceber.erro });
    return;
  }

  res.status(200).json(contaReceber.contaReceber);
}

export async function deletar(req: Request, res: Response) {
  const resultado = idContaReceberSchema.safeParse(req.params);

  if (!resultado.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const deletado = await deletarContaReceber(resultado.data.id);

  if ("erro" in deletado) {
    const status =
      deletado.erro === "CONTA A RECEBER NÃO ENCONTRADA" ? 404 : 409;
    res.status(status).json({ erro: deletado.erro });
    return;
  }

  res.status(204).send();
}
