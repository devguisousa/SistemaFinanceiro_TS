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

// POST /contaReceber/:id/recebimentos
export async function cadastrar(req: Request, res: Response) {
  const resultadoId = idRecebimentoSchema.safeParse(req.params);

  if (!resultadoId.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultadoId.error.issues,
    });
    return;
  }

  const resultado = recebimentoSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const recebimento = await cadastrarRecebimento(req.usuario!.id, {
    contaReceberId: resultadoId.data.id,
    contaId: resultado.data.contaId,
    categoriaId: resultado.data.categoriaId,
    valor: resultado.data.valor,
  });

  if ("erro" in recebimento) {
    // Conta a receber, conta bancária ou categoria não encontrada
    const status = recebimento.erro.includes("NÃO ENCONTRADA") ? 404 : 409;
    res.status(status).json({ erro: recebimento.erro });
    return;
  }

  res.status(201).json(recebimento);
}

// GET /recebimentos
export async function listar(req: Request, res: Response) {
  const resultado = paginacaoRecebimentoSchema.safeParse(req.query);

  if (!resultado.success) {
    res.status(400).json({
      erro: "PARÂMETROS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const { pagina, limite } = resultado.data;

  const recebimentos = await listarRecebimentos(
    req.usuario!.id,
    pagina,
    limite,
  );

  res.status(200).json(recebimentos);
}

// GET /recebimentos/:id
export async function buscar(req: Request, res: Response) {
  const resultado = idRecebimentoSchema.safeParse(req.params);

  if (!resultado.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const recebimento = await buscarRecebimento(
    req.usuario!.id,
    resultado.data.id,
  );

  if ("erro" in recebimento) {
    res.status(404).json({ erro: recebimento.erro });
    return;
  }

  res.status(200).json(recebimento.recebimento);
}

// GET /contaReceber/:id/recebimentos
export async function listarPorContaReceber(req: Request, res: Response) {
  const resultadoId = idRecebimentoSchema.safeParse(req.params);

  if (!resultadoId.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultadoId.error.issues,
    });
    return;
  }

  const resultado = paginacaoRecebimentoSchema.safeParse(req.query);

  if (!resultado.success) {
    res.status(400).json({
      erro: "PARÂMETROS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const { pagina, limite } = resultado.data;

  const recebimentos = await listarRecebimentosPorContaReceber(
    req.usuario!.id,
    resultadoId.data.id,
    pagina,
    limite,
  );

  if ("erro" in recebimentos) {
    res.status(404).json({ erro: recebimentos.erro });
    return;
  }

  res.status(200).json(recebimentos);
}
