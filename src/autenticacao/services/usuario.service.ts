import type { Papel } from "../../../generated/prisma/client.js";
import { prisma } from "../../prisma.js";
import { executarTransacao } from "../../utils/transacao.js";

const dadosPublicos = {
  id: true,
  email: true,
  papel: true,
  criadoEm: true,
} as const;

export async function listarUsuarios(pagina = 1, limite = 10) {
  const skip = (pagina - 1) * limite;

  const usuarios = await prisma.usuario.findMany({
    skip,
    take: limite,
    orderBy: { id: "asc" },
    select: dadosPublicos,
  });

  const total = await prisma.usuario.count();

  return {
    usuarios,
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite),
  };
}

export async function buscarUsuario(id: number) {
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: dadosPublicos,
  });

  if (!usuario) {
    return { erro: "USUÁRIO NÃO ENCONTRADO" } as const;
  }

  return { usuario };
}

// O sistema nunca pode ficar sem nenhum ADMIN
const ERRO_ULTIMO_ADMIN = "NÃO É POSSÍVEL REMOVER O ÚLTIMO ADMIN";

export async function alterarPapel(id: number, papel: Papel) {
  return executarTransacao(async (tx) => {
    const usuario = await tx.usuario.findUnique({ where: { id } });

    if (!usuario) {
      return { erro: "USUÁRIO NÃO ENCONTRADO" } as const;
    }

    if (usuario.papel === "ADMIN" && papel !== "ADMIN") {
      const admins = await tx.usuario.count({ where: { papel: "ADMIN" } });

      if (admins <= 1) {
        return { erro: ERRO_ULTIMO_ADMIN } as const;
      }
    }

    const atualizado = await tx.usuario.update({
      where: { id },
      data: { papel },
      select: dadosPublicos,
    });

    return { usuario: atualizado };
  });
}

export async function apagarUsuario(id: number) {
  return executarTransacao(async (tx) => {
    const usuario = await tx.usuario.findUnique({ where: { id } });

    if (!usuario) {
      return { erro: "USUÁRIO NÃO ENCONTRADO" } as const;
    }

    if (usuario.papel === "ADMIN") {
      const admins = await tx.usuario.count({ where: { papel: "ADMIN" } });

      if (admins <= 1) {
        return { erro: ERRO_ULTIMO_ADMIN } as const;
      }
    }

    // Refresh tokens são apagados em cascata; o access token deixa de valer
    // porque o middleware confere se o usuário ainda existe
    await tx.usuario.delete({ where: { id } });

    return { ok: true } as const;
  });
}
