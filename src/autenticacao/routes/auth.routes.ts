import bcrypt from "bcrypt";
import { Router } from "express";
import { prisma } from "../../prisma.js";
import { limitadorAuth, limitadorRefresh } from "../middlewares/limitador.js";
import { cadastroSchema, loginSchema, refreshSchema } from "../schema/auth.js";
import {
  gerarAccessToken,
  gerarRefreshToken,
  hashToken,
  limparTokensExpirados,
  trocarRefreshToken,
} from "../service/token.service.js";

export const authRotas = Router();

authRotas.post("/registrar", limitadorAuth, async (req, res) => {
  const resultado = cadastroSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const { email, senha } = resultado.data;

  const existe = await prisma.usuario.findUnique({
    where: { email },
  });

  if (existe) {
    return res.status(409).json({ erro: "USUÁRIO JÁ EXISTE" });
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  const usuario = await prisma.usuario.create({
    data: {
      email,
      senha: senhaHash,
    },
  });

  res.status(201).json({ id: usuario.id, email: usuario.email });
});

authRotas.post("/login", limitadorAuth, async (req, res) => {
  const resultado = loginSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const { email, senha } = resultado.data;

  const usuario = await prisma.usuario.findUnique({
    where: { email },
  });

  const senhaCorreta = usuario && (await bcrypt.compare(senha, usuario.senha));

  if (!usuario || !senhaCorreta) {
    return res.status(401).json({ erro: "USUÁRIO OU SENHA INCORRETOS" });
  }

  await limparTokensExpirados(usuario.id);

  const accessToken = gerarAccessToken(usuario.id);
  const refreshToken = await gerarRefreshToken(usuario.id);

  res.json({ accessToken, refreshToken });
});

authRotas.post("/refresh", limitadorRefresh, async (req, res) => {
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
    return res.status(401).json(tokens);
  }

  res.json(tokens);
});

authRotas.post("/logout", async (req, res) => {
  const resultado = refreshSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  await prisma.refreshToken.deleteMany({
    where: { hash: hashToken(resultado.data.refreshToken) },
  });

  res.status(204).send();
});
