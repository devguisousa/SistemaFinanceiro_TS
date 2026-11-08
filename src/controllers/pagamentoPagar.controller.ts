import type { Request, Response } from "express";
import {
  idPagamentoSchema,
  paginacaoPagamentoSchema,
  registrarPagamentoSchema,
} from "../schemas/pagamentoPagar.schema.js";
import {
  buscarPagamento as buscarPagamentoService,
  listarPagamentoContaPagar as listarPagamentoContaPagarService,
  listarPagamento as listarPagamentoService,
  registrarPagamento as registrarPagamentoService,
} from "../services/pagamentoPagar.service.js";

// POST /pagamentoPagar/contaPagar/:id
export async function registrarPagamento(req: Request, res: Response) {
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

  const pagamento = await registrarPagamentoService(req.usuario!.id, {
    contaPagarId: resultadoId.data.id,
    contaId: resultado.data.contaId,
    categoriaId: resultado.data.categoriaId,
    valor: resultado.data.valor,
  });

  if ("erro" in pagamento) {
    // Conta a pagar, conta bancária ou categoria não encontrada
    const status = pagamento.erro.includes("NÃO ENCONTRADA") ? 404 : 409;
    res.status(status).json({ erro: pagamento.erro });
    return;
  }

  res.status(201).json(pagamento);
}

export async function listarPagamento(req: Request, res: Response) {
  const resultado = paginacaoPagamentoSchema.safeParse(req.query);

  if (!resultado.success) {
    res.status(400).json({
      erro: "PARÂMETROS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const { pagina, limite } = resultado.data;

  const pagamentos = await listarPagamentoService(
    req.usuario!.id,
    pagina,
    limite,
  );

  res.status(200).json(pagamentos);
}

export async function buscarPagamento(req: Request, res: Response) {
  const resultado = idPagamentoSchema.safeParse(req.params);

  if (!resultado.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const pagamento = await buscarPagamentoService(
    req.usuario!.id,
    resultado.data.id,
  );

  if ("erro" in pagamento) {
    res.status(404).json({ erro: pagamento.erro });
    return;
  }

  res.status(200).json(pagamento);
}

// GET /pagamentoPagar/contaPagar/:id
export async function listarPagamentoContaPagar(req: Request, res: Response) {
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
    req.usuario!.id,
    resultadoId.data.id,
    pagina,
    limite,
  );

  if ("erro" in pagamentos) {
    res.status(404).json({ erro: pagamentos.erro });
    return;
  }

  res.status(200).json(pagamentos);
}
