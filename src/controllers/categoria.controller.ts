import type { Request, Response } from "express";
import {
  categoriaSchema,
  idCategoriaSchema,
  paginacaoCategoriaSchema,
} from "../schemas/categoria.schema.js";
import {
  atualizarCategoria,
  buscarCategoria,
  cadastrarCategoria,
  deletarCategoria,
  listarCategoria,
} from "../services/categoria.service.js";

export async function cadastrar(req: Request, res: Response) {
  const resultado = categoriaSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const categoria = await cadastrarCategoria(req.usuario!.id, resultado.data);

  if ("erro" in categoria) {
    res.status(409).json({ erro: categoria.erro });
    return;
  }

  res.status(201).json(categoria.categoria);
}

export async function listar(req: Request, res: Response) {
  const resultado = paginacaoCategoriaSchema.safeParse(req.query);

  if (!resultado.success) {
    res.status(400).json({
      erro: "PARÂMETROS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const pagina = resultado.data.page ?? 1;
  const limite = resultado.data.limit ?? 10;

  const categorias = await listarCategoria(
    req.usuario!.id,
    pagina,
    limite,
    resultado.data.tipo,
  );

  res.status(200).json(categorias);
}

export async function buscar(req: Request, res: Response) {
  const resultado = idCategoriaSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const categoria = await buscarCategoria(req.usuario!.id, resultado.data);

  if ("erro" in categoria) {
    res.status(404).json({ erro: categoria.erro });
    return;
  }

  res.status(200).json(categoria.categoria);
}

export async function atualizar(req: Request, res: Response) {
  const resultadoId = idCategoriaSchema.safeParse(req.params.id);

  if (!resultadoId.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultadoId.error.issues,
    });
    return;
  }

  const resultado = categoriaSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const categoria = await atualizarCategoria(
    req.usuario!.id,
    resultadoId.data,
    resultado.data,
  );

  if ("erro" in categoria) {
    const status = categoria.erro === "CATEGORIA NÃO ENCONTRADA" ? 404 : 409;
    res.status(status).json({ erro: categoria.erro });
    return;
  }

  res.status(200).json(categoria.categoria);
}

export async function deletar(req: Request, res: Response) {
  const resultado = idCategoriaSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const deletado = await deletarCategoria(req.usuario!.id, resultado.data);

  if ("erro" in deletado) {
    const status = deletado.erro === "CATEGORIA NÃO ENCONTRADA" ? 404 : 409;
    res.status(status).json({ erro: deletado.erro });
    return;
  }

  res.status(204).send();
}
