import type { Request, Response } from "express";
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
  const resultado = cadastroSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const usuario = await registrarUsuario(resultado.data);

  if ("erro" in usuario) {
    res.status(409).json({ erro: usuario.erro });
    return;
  }

  res.status(201).json(usuario.usuario);
}

// GET /auth/status (pública): a tela de login pergunta se precisa criar o ADMIN
export async function status(req: Request, res: Response) {
  const precisaAdmin = await precisaDeAdmin();

  res.status(200).json({ precisaAdmin });
}

// POST /auth/primeiro-admin (pública): só funciona com o banco sem ADMIN
export async function primeiroAdmin(req: Request, res: Response) {
  const resultado = primeiroAdminSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const tokens = await criarPrimeiroAdmin(resultado.data);

  if ("erro" in tokens) {
    res.status(409).json({ erro: tokens.erro });
    return;
  }

  res.status(201).json(tokens);
}

export async function login(req: Request, res: Response) {
  const resultado = loginSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const tokens = await logarUsuario(resultado.data);

  if ("erro" in tokens) {
    res.status(401).json({ erro: tokens.erro });
    return;
  }

  res.status(200).json(tokens);
}

export async function refresh(req: Request, res: Response) {
  const resultado = refreshSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const tokens = await trocarRefreshToken(resultado.data.refreshToken);

  if ("erro" in tokens) {
    res.status(401).json({ erro: tokens.erro });
    return;
  }

  res.status(200).json(tokens);
}

export async function logout(req: Request, res: Response) {
  const resultado = refreshSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  await deslogarUsuario(resultado.data.refreshToken);

  res.status(204).send();
}

// GET /auth/me
export async function perfil(req: Request, res: Response) {
  const usuario = await buscarPerfil(req.usuario!.id);

  if ("erro" in usuario) {
    res.status(404).json({ erro: usuario.erro });
    return;
  }

  res.status(200).json(usuario.usuario);
}

// PUT /auth/senha
export async function alterarSenha(req: Request, res: Response) {
  const resultado = trocarSenhaSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const { senhaAtual, novaSenha } = resultado.data;

  const troca = await trocarSenha(req.usuario!.id, senhaAtual, novaSenha);

  if ("erro" in troca) {
    const status = troca.erro === "SENHA ATUAL INCORRETA" ? 401 : 404;
    res.status(status).json({ erro: troca.erro });
    return;
  }

  res.status(204).send();
}

// POST /auth/sair-de-todos
export async function sairDeTodosOsDispositivos(req: Request, res: Response) {
  await sairDeTodos(req.usuario!.id);

  res.status(204).send();
}
