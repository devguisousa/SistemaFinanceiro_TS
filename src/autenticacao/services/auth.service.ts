import bcrypt from "bcrypt";
import type { Papel } from "../../../generated/prisma/client.js";
import { prisma } from "../../prisma.js";
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

const CUSTO_BCRYPT = 10;

// Usado quando o e-mail não existe: o bcrypt.compare roda do mesmo jeito,
// então o tempo de resposta não revela quais e-mails têm cadastro
const HASH_FALSO = bcrypt.hashSync("senha-que-nunca-confere", CUSTO_BCRYPT);

const dadosPublicos = {
  id: true,
  email: true,
  papel: true,
  criadoEm: true,
} as const;

export async function registrarUsuario(
  dados: Credenciais & { papel?: Papel | undefined },
) {
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
      papel: dados.papel ?? "USUARIO",
    },
    select: dadosPublicos,
  });

  return { usuario };
}

export async function precisaDeAdmin() {
  const admins = await prisma.usuario.count({ where: { papel: "ADMIN" } });
  return admins === 0;
}

/** Cria o primeiro ADMIN e já devolve os tokens. Só funciona se não houver nenhum ADMIN. */
export async function criarPrimeiroAdmin(dados: Credenciais) {
  // Hash fora da transação para não segurar o lock durante o bcrypt
  const senha = await bcrypt.hash(dados.senha, CUSTO_BCRYPT);

  return prisma.$transaction(async (tx) => {
    // Pedidos simultâneos esperam aqui um pelo outro; o lock é liberado no commit.
    // 7428301 é só uma chave fixa que identifica este lock
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

export async function logarUsuario({ email, senha }: Credenciais) {
  const usuario = await prisma.usuario.findUnique({
    where: { email },
  });

  const senhaCorreta = await bcrypt.compare(
    senha,
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

/** Troca a senha e derruba todas as sessões (inclusive a atual). */
export async function trocarSenha(
  id: number,
  senhaAtual: string,
  novaSenha: string,
) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });

  if (!usuario) {
    return { erro: "USUÁRIO NÃO ENCONTRADO" } as const;
  }

  if (!(await bcrypt.compare(senhaAtual, usuario.senha))) {
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
