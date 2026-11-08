import bcrypt from "bcrypt";
import type { Papel } from "../../generated/prisma/client.js";
import { prisma } from "../prisma.js";
import {
  gerarAccessToken,
  gerarRefreshToken,
  hashToken,
  limparTokensExpirados,
  revogarSessoes,
} from "./token.service.js";

type Credenciais = {
  email: string;
  senha: string;
};

type DadosCadastro = {
  email: string;
  senha: string;
  papel: Papel;
};

const CUSTO_BCRYPT = 10;

// Usado quando o e-mail não existe: o bcrypt.compare roda do mesmo jeito,
// assim o tempo da resposta não entrega quais e-mails têm cadastro
const HASH_FALSO = bcrypt.hashSync("senha-que-nunca-confere", CUSTO_BCRYPT);

// O que pode sair na resposta (nunca a senha)
const dadosPublicos = {
  id: true,
  email: true,
  papel: true,
  criadoEm: true,
} as const;

export async function registrarUsuario(dados: DadosCadastro) {
  const existe = await prisma.usuario.findUnique({
    where: { email: dados.email },
  });

  if (existe) {
    return { erro: "USUÁRIO JÁ EXISTE" } as const;
  }

  const usuario = await prisma.usuario.create({
    data: {
      email: dados.email,
      senha: await bcrypt.hash(dados.senha, CUSTO_BCRYPT),
      papel: dados.papel,
    },
    select: dadosPublicos,
  });

  return { usuario };
}

export async function precisaDeAdmin() {
  const admins = await prisma.usuario.count({ where: { papel: "ADMIN" } });

  return admins === 0;
}

// Cria o primeiro ADMIN e já devolve os tokens. Só funciona se não tiver nenhum ADMIN
export async function criarPrimeiroAdmin(dados: Credenciais) {
  // O hash fica fora da transação para não segurar o lock durante o bcrypt
  const senha = await bcrypt.hash(dados.senha, CUSTO_BCRYPT);

  return prisma.$transaction(async (tx) => {
    // Pedidos ao mesmo tempo esperam um pelo outro aqui (o lock solta no commit).
    // 7428301 é só um número fixo que identifica esse lock
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7428301)`;

    const admins = await tx.usuario.count({ where: { papel: "ADMIN" } });

    if (admins > 0) {
      return { erro: "JÁ EXISTE UM ADMINISTRADOR" } as const;
    }

    const existe = await tx.usuario.findUnique({
      where: { email: dados.email },
    });

    if (existe) {
      return { erro: "USUÁRIO JÁ EXISTE" } as const;
    }

    const usuario = await tx.usuario.create({
      data: { email: dados.email, senha, papel: "ADMIN" },
    });

    return {
      accessToken: gerarAccessToken(usuario),
      refreshToken: await gerarRefreshToken(usuario.id, tx),
    };
  });
}

export async function logarUsuario(dados: Credenciais) {
  const usuario = await prisma.usuario.findUnique({
    where: { email: dados.email },
  });

  const senhaCorreta = await bcrypt.compare(
    dados.senha,
    usuario?.senha ?? HASH_FALSO,
  );

  if (!usuario || !senhaCorreta) {
    return { erro: "USUÁRIO OU SENHA INCORRETOS" } as const;
  }

  await limparTokensExpirados(usuario.id);

  return {
    accessToken: gerarAccessToken(usuario),
    refreshToken: await gerarRefreshToken(usuario.id),
  };
}

export async function deslogarUsuario(refreshToken: string) {
  await prisma.refreshToken.deleteMany({
    where: { hash: hashToken(refreshToken) },
  });
}

export async function buscarPerfil(id: number) {
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: dadosPublicos,
  });

  if (!usuario) {
    return { erro: "USUÁRIO NÃO ENCONTRADO" } as const;
  }

  return { usuario };
}

// Troca a senha e derruba todas as sessões (inclusive a atual)
export async function trocarSenha(
  id: number,
  senhaAtual: string,
  novaSenha: string,
) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });

  if (!usuario) {
    return { erro: "USUÁRIO NÃO ENCONTRADO" } as const;
  }

  const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senha);

  if (!senhaCorreta) {
    return { erro: "SENHA ATUAL INCORRETA" } as const;
  }

  const senha = await bcrypt.hash(novaSenha, CUSTO_BCRYPT);

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id }, data: { senha } });
    await revogarSessoes(id, tx);
  });

  return { ok: true } as const;
}

export async function sairDeTodos(id: number) {
  await revogarSessoes(id);
}
