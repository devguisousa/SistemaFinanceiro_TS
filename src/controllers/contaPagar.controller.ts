import type { Request, Response } from "express";
import {
  atualizarContaPagarSchema,
  cadastrarContaPagarSchema,
  filtroContaPagarSchema,
  idContaPagarSchema,
} from "../schemas/contaPagar.schema.js";
import {
  atualizarContaPagar,
  buscarContaPagar,
  cadastrarContaPagar,
  deletarContaPagar,
  listarContaPagar,
} from "../services/contaPagar.service.js";

export async function cadastrar(req: Request, res: Response) {
  const resultado = cadastrarContaPagarSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const contaPagar = await cadastrarContaPagar(req.usuario!.id, resultado.data);

  res.status(201).json(contaPagar.contaPagar);
}

export async function listar(req: Request, res: Response) {
  const resultado = filtroContaPagarSchema.safeParse(req.query);

  if (!resultado.success) {
    res.status(400).json({
      erro: "PARÂMETROS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const filtro = resultado.data;

  const contasPagar = await listarContaPagar(req.usuario!.id, {
    status: filtro.status,
    vencidas: filtro.vencidas,
    pagina: filtro.page,
    limite: filtro.limit,
  });

  res.status(200).json(contasPagar);
}

export async function buscar(req: Request, res: Response) {
  const resultado = idContaPagarSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const contaPagar = await buscarContaPagar(req.usuario!.id, resultado.data);

  if ("erro" in contaPagar) {
    res.status(404).json({ erro: contaPagar.erro });
    return;
  }

  res.status(200).json(contaPagar.contaPagar);
}

export async function atualizar(req: Request, res: Response) {
  const resultadoId = idContaPagarSchema.safeParse(req.params.id);

  if (!resultadoId.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultadoId.error.issues,
    });
    return;
  }

  const resultado = atualizarContaPagarSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const contaPagar = await atualizarContaPagar(
    req.usuario!.id,
    resultadoId.data,
    resultado.data,
  );

  if ("erro" in contaPagar) {
    const status =
      contaPagar.erro === "CONTA A PAGAR NÃO ENCONTRADA" ? 404 : 409;
    res.status(status).json({ erro: contaPagar.erro });
    return;
  }

  res.status(200).json(contaPagar.contaPagar);
}

export async function deletar(req: Request, res: Response) {
  const resultado = idContaPagarSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const deletado = await deletarContaPagar(req.usuario!.id, resultado.data);

  if ("erro" in deletado) {
    const status = deletado.erro === "CONTA A PAGAR NÃO ENCONTRADA" ? 404 : 409;
    res.status(status).json({ erro: deletado.erro });
    return;
  }

  res.status(204).send();
}
