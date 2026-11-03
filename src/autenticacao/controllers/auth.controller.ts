import type { Request, Response } from "express";
import { responderErro, validar } from "../../utils/http.js";
import {
  cadastroSchema,
  loginSchema,
  refreshSchema,
  trocarSenhaSchema,
} from "../schemas/auth.schema.js";
import {
  buscarPerfil,
  deslogarUsuario,
  logarUsuario,
  registrarUsuario,
  sairDeTodos,
  trocarSenha,
} from "../services/auth.service.js";
import { trocarRefreshToken } from "../services/token.service.js";

// POST /auth/registrar (somente ADMIN)
export async function registrar(req: Request, res: Response) {
  const dados = validar(res, cadastroSchema, req.body, "DADOS INVÁLIDOS");
  if (!dados) return;

  const resultado = await registrarUsuario(dados);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(201).json(resultado.usuario);
}

export async function login(req: Request, res: Response) {
  const dados = validar(res, loginSchema, req.body, "DADOS INVÁLIDOS");
  if (!dados) return;

  const tokens = await logarUsuario(dados);

  if ("erro" in tokens) {
    res.status(401).json(tokens);
    return;
  }

  res.status(200).json(tokens);
}

export async function refresh(req: Request, res: Response) {
  const dados = validar(res, refreshSchema, req.body, "DADOS INVÁLIDOS");
  if (!dados) return;

  const tokens = await trocarRefreshToken(dados.refreshToken);

  if ("erro" in tokens) {
    res.status(401).json(tokens);
    return;
  }

  res.status(200).json(tokens);
}

export async function logout(req: Request, res: Response) {
  const dados = validar(res, refreshSchema, req.body, "DADOS INVÁLIDOS");
  if (!dados) return;

  await deslogarUsuario(dados.refreshToken);

  res.status(204).send();
}

// GET /auth/me
export async function perfil(req: Request, res: Response) {
  const resultado = await buscarPerfil(req.usuario!.id);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(200).json(resultado.usuario);
}

// PUT /auth/senha
export async function alterarSenha(req: Request, res: Response) {
  const dados = validar(res, trocarSenhaSchema, req.body, "DADOS INVÁLIDOS");
  if (!dados) return;

  const resultado = await trocarSenha(
    req.usuario!.id,
    dados.senhaAtual,
    dados.novaSenha,
  );

  if ("erro" in resultado) {
    const status = resultado.erro === "SENHA ATUAL INCORRETA" ? 401 : 404;
    res.status(status).json(resultado);
    return;
  }

  res.status(204).send();
}

// POST /auth/sair-de-todos
export async function sairDeTodosOsDispositivos(req: Request, res: Response) {
  await sairDeTodos(req.usuario!.id);

  res.status(204).send();
}
