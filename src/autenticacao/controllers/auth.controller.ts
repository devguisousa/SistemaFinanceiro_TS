import type { Request, Response } from "express";
import { responderErro, validar } from "../../utils/http.js";
import {
  cadastroSchema,
  loginSchema,
  primeiroAdminSchema,
  refreshSchema,
  trocarSenhaSchema,
} from "../schemas/auth.schema.js";
import {
  buscarPerfil,
  criarPrimeiroAdmin,
  deslogarUsuario,
  logarUsuario,
  precisaDeAdmin,
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

// GET /auth/status (pública): a tela de login pergunta se precisa criar o ADMIN
export async function status(req: Request, res: Response) {
  res.status(200).json({ precisaAdmin: await precisaDeAdmin() });
}

// POST /auth/primeiro-admin (pública): só funciona com o banco sem ADMIN
export async function primeiroAdmin(req: Request, res: Response) {
  const dados = validar(res, primeiroAdminSchema, req.body, "DADOS INVÁLIDOS");
  if (!dados) return;

  const resultado = await criarPrimeiroAdmin(dados);

  if ("erro" in resultado) {
    responderErro(res, resultado.erro);
    return;
  }

  res.status(201).json(resultado);
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
