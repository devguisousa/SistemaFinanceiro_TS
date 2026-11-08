import type { Papel } from "../../generated/prisma/client.js";
import { executarTransacao, prisma } from "../prisma.js";

// O que pode sair na resposta (nunca a senha)
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

  const totalPaginas = Math.ceil(total / limite);

  return { usuarios, total, pagina, limite, totalPaginas };
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

// O sistema nunca pode ficar sem ADMIN
export async function alterarPapel(id: number, papel: Papel) {
  return executarTransacao(async (tx) => {
    const usuario = await tx.usuario.findUnique({ where: { id } });

    if (!usuario) {
      return { erro: "USUÁRIO NÃO ENCONTRADO" } as const;
    }

    if (usuario.papel === "ADMIN" && papel !== "ADMIN") {
      const admins = await tx.usuario.count({ where: { papel: "ADMIN" } });

      if (admins <= 1) {
        return { erro: "NÃO É POSSÍVEL REMOVER O ÚLTIMO ADMIN" } as const;
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
        return { erro: "NÃO É POSSÍVEL REMOVER O ÚLTIMO ADMIN" } as const;
      }
    }

    // Os refresh tokens são apagados em cascata. O access token para de valer
    // porque o autenticar confere se o usuário ainda existe
    await tx.usuario.delete({ where: { id } });

    return { ok: true } as const;
  });
}
