
import type { Request, Response } from "express";

import {
  registrarPagamento as registrarPagamentoService,
  listarPagamento as listarPagamentoService,
  buscarPagamento as buscarPagamentoService,
  listarPagamentoContaPagar as listarPagamentoContaPagarService,
} from "../services/pagamentosPagar.service.js";

import {
  registrarPagamentoSchema,
  idPagamentoSchema,
  paginacaoPagamentoSchema,
} from "../schemas/pagamentoPagar.shema.js";
export async function registrarPagamento(
  req: Request,
  res: Response,
) {
  const resultadoId = idPagamentoSchema.safeParse(req.params);

  if (!resultadoId.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultadoId.error.issues,
    });
    return;
  }


  const resultado = registrarPagamentoSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }


  const pagamento = await registrarPagamentoService({
    contaPagarId: resultadoId.data.id,
    contaId: resultado.data.contaId,
    categoriaId: resultado.data.categoriaId,
    valor: resultado.data.valor,
  });


  if ("erro" in pagamento) {
    if (
      pagamento.erro === "CONTA A PAGAR NÃO ENCONTRADA" ||
      pagamento.erro === "CONTA BANCÁRIA NÃO ENCONTRADA" ||
      pagamento.erro === "CATEGORIA NÃO ENCONTRADA"
    ) {
      res.status(404).json(pagamento);
      return;
    }

    res.status(409).json(pagamento);
    return;
  }


  res.status(201).json(pagamento);
}


export async function listarPagamento(
  req: Request,
  res: Response,
) {
  const resultado = paginacaoPagamentoSchema.safeParse(req.query);

  if (!resultado.success) {
    res.status(400).json({
      erro: "PARÂMETROS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const { pagina, limite } = resultado.data;

  const pagamentos = await listarPagamentoService(pagina, limite);

  res.status(200).json(pagamentos);
}

export async function buscarPagamento(
  req: Request,
  res: Response,
) {
  const resultado = idPagamentoSchema.safeParse(req.params);

  if (!resultado.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const pagamento = await buscarPagamentoService(resultado.data.id);

  if ("erro" in pagamento) {
    res.status(404).json(pagamento);
    return;
  }

  res.status(200).json(pagamento);
}

export async function listarPagamentoContaPagar(
  req: Request,
  res: Response,
) {
  const resultadoId = idPagamentoSchema.safeParse(req.params);

  if (!resultadoId.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultadoId.error.issues,
    });
    return;
  }

  const resultado = paginacaoPagamentoSchema.safeParse(req.query);

  if (!resultado.success) {
    res.status(400).json({
      erro: "PARÂMETROS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const { pagina, limite } = resultado.data;

  const pagamentos = await listarPagamentoContaPagarService(
    resultadoId.data.id,
    pagina,
    limite,
  );

  if ("erro" in pagamentos) {
    res.status(404).json(pagamentos);
    return;
  }

  res.status(200).json(pagamentos);
}
