import type { Request, Response } from "express";
import {
  alterarPapelSchema,
  idUsuarioSchema,
  paginacaoUsuarioSchema,
} from "../schemas/auth.schema.js";
import {
  alterarPapel,
  apagarUsuario,
  buscarUsuario,
  listarUsuarios,
} from "../services/usuario.service.js";

export async function listar(req: Request, res: Response) {
  const resultado = paginacaoUsuarioSchema.safeParse(req.query);

  if (!resultado.success) {
    res.status(400).json({
      erro: "PARÂMETROS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const pagina = resultado.data.page ?? 1;
  const limite = resultado.data.limit ?? 10;

  const usuarios = await listarUsuarios(pagina, limite);

  res.status(200).json(usuarios);
}

export async function buscar(req: Request, res: Response) {
  const resultado = idUsuarioSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const usuario = await buscarUsuario(resultado.data);

  if ("erro" in usuario) {
    res.status(404).json({ erro: usuario.erro });
    return;
  }

  res.status(200).json(usuario.usuario);
}

export async function mudarPapel(req: Request, res: Response) {
  const resultadoId = idUsuarioSchema.safeParse(req.params.id);

  if (!resultadoId.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultadoId.error.issues,
    });
    return;
  }

  const resultado = alterarPapelSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const usuario = await alterarPapel(resultadoId.data, resultado.data.papel);

  if ("erro" in usuario) {
    const status = usuario.erro === "USUÁRIO NÃO ENCONTRADO" ? 404 : 409;
    res.status(status).json({ erro: usuario.erro });
    return;
  }

  res.status(200).json(usuario.usuario);
}

export async function apagar(req: Request, res: Response) {
  const resultado = idUsuarioSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const apagado = await apagarUsuario(resultado.data);

  if ("erro" in apagado) {
    const status = apagado.erro === "USUÁRIO NÃO ENCONTRADO" ? 404 : 409;
    res.status(status).json({ erro: apagado.erro });
    return;
  }

  res.status(204).send();
}
