import { prisma } from "../prisma.js";

export async function cadastrarCategoria(nome: string) {
  const nomeLimpo = nome.trim();
  const existe = await prisma.categoria.findUnique({
    where: { nome: nomeLimpo },
  });

  if (existe) {
    return { erro: "CATEGORIA JÁ EXISTE" } as const;
  }

  const categoria = await prisma.categoria.create({
    data: {
      nome: nomeLimpo,
    },
  });

  return { categoria };
}

export async function listarCategoria(pagina = 1, limite = 10) {
  const skip = (pagina - 1) * limite;

  const categoria = await prisma.categoria.findMany({
    skip,
    take: limite,
    orderBy: { nome: "asc" },
  });

  const total = await prisma.categoria.count();

  const totalPaginas = Math.ceil(total / limite);

  return { categoria, total, pagina, limite, totalPaginas };
}

export async function buscarCategoria(id: number) {
  const categoria = await prisma.categoria.findUnique({
    where: { id },
  });

  if (!categoria) {
    return { erro: "CATEGORIA NÃO ENCONTRADA" } as const;
  }

  return { categoria };
}

export async function atualizarCategoria(id: number, nome: string) {
  const existe = await buscarCategoria(id);

  if ("erro" in existe) {
    return existe;
  }

  const nomeLimpo = nome.trim();

  const outraCategoria = await prisma.categoria.findUnique({
    where: {
      nome: nomeLimpo,
    },
  });

  if (outraCategoria && outraCategoria.id !== id) {
    return { erro: "CATEGORIA JÁ EXISTE" } as const;
  }

  const categoria = await prisma.categoria.update({
    where: { id },
    data: {
      nome: nome.trim(),
    },
  });

  return { categoria };
}

export async function deletarCategoria(id: number) {
  const existe = await buscarCategoria(id);

  if ("erro" in existe) {
    return existe;
  }

  const categoria = await prisma.categoria.delete({
    where: { id },
  });

  return { categoria };
}
