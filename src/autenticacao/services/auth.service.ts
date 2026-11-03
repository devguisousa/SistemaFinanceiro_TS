import bcrypt from "bcrypt";
import { prisma } from "../../prisma.js";
import {
  gerarAccessToken,
  gerarRefreshToken,
  hashToken,
  limparTokensExpirados,
} from "./token.service.js";

type Credenciais = {
  email: string;
  senha: string;
};

const CUSTO_BCRYPT = 10;

// Usado quando o e-mail não existe: o bcrypt.compare roda do mesmo jeito,
// então o tempo de resposta não revela quais e-mails têm cadastro
const HASH_FALSO = bcrypt.hashSync("senha-que-nunca-confere", CUSTO_BCRYPT);

export async function registrarUsuario({ email, senha }: Credenciais) {
  const existe = await prisma.usuario.findUnique({
    where: { email },
  });

  if (existe) {
    return { erro: "USUÁRIO JÁ EXISTE" } as const;
  }

  const senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT);

  const usuario = await prisma.usuario.create({
    data: {
      email,
      senha: senhaHash,
    },
  });

  return { usuario: { id: usuario.id, email: usuario.email } };
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
    accessToken: gerarAccessToken(usuario.id),
    refreshToken: await gerarRefreshToken(usuario.id),
  };
}

export async function deslogarUsuario(refreshToken: string) {
  await prisma.refreshToken.deleteMany({
    where: { hash: hashToken(refreshToken) },
  });
}
