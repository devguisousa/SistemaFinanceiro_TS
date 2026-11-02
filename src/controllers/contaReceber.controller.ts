import type { Request, Response } from "express";
import {
  contaReceberSchema,
  idContaReceberSchema,
  paginacaoContaReceberSchema,
} from "../schemas/contaReceber.shema.js";
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
      erro: resultado.error.issues,
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
      erro: resultado.error.issues,
    });
    return;
  }

  const pagina = resultado.data.pagina ?? 1;
  const limite = resultado.data.limite ?? 10;

  const contaReceber = await listarContaReceber(pagina, limite);

  res.status(200).json(contaReceber);
}

export async function buscar(req: Request, res: Response) {
  const resultado = idContaReceberSchema.safeParse(req.params);
  if (!resultado.success) {
    res.status(400).json({
      erro: resultado.error,
    });
    return;
  }

  const contaReceber = await buscarContaReceber(resultado.data.id);

  if ("erro" in contaReceber) {
    res.status(404).json({ erro: contaReceber.erro });

    return
  }

  res.status(200).json(contaReceber.contaReceber);
}

export async function atualizar(req: Request, res: Response) {
  const resultado = idContaReceberSchema.safeParse(req.params);
  if (!resultado.success) {
    res.status(400).json({
      erro: resultado.error.issues,
    });
    return;
  }

  const outroResultado = contaReceberSchema.safeParse(req.body);

  if (!outroResultado.success) {
    res.status(400).json({
      erro: outroResultado.error.issues,
    });

    return;
  }

  const contaReceber = await atualizarContaReceber(
    resultado.data.id,
    outroResultado.data,
  );

  if ("erro" in contaReceber) {
    res.status(404).json({ erro: contaReceber.erro });

    return;
  }

  res.status(200).json(contaReceber.contaReceber);
}

export async function deletar(req: Request, res: Response) {
  const resultado = idContaReceberSchema.safeParse(req.params);
  if (!resultado.success) {
    res.status(400).json({
      erro: resultado.error.issues,
    });
    return;
  }

  const contaReceber = await deletarContaReceber(resultado.data.id);

  if ("erro" in contaReceber) {
    res.status(404).json({ erro: contaReceber.erro });

    return;
  }
  res.status(204).send();
}
