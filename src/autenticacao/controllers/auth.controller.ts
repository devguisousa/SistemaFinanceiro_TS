import type { Request, Response } from "express";
import {
  cadastroSchema,
  loginSchema,
  refreshSchema,
} from "../schemas/auth.schema.js";
import {
  deslogarUsuario,
  logarUsuario,
  registrarUsuario,
} from "../services/auth.service.js";
import { trocarRefreshToken } from "../services/token.service.js";

export async function registrar(req: Request, res: Response) {
  const resultado = cadastroSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const cadastro = await registrarUsuario(resultado.data);

  if ("erro" in cadastro) {
    res.status(409).json(cadastro);
    return;
  }

  res.status(201).json(cadastro.usuario);
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
    res.status(401).json(tokens);
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
    res.status(401).json(tokens);
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
