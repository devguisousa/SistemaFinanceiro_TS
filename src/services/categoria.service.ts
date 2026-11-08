import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../prisma.js";

type TipoCategoria = "RECEITA" | "DESPESA";

type DadosCategoria = {
  nome: string;
  tipo: TipoCategoria;
};

// Categorias usadas pelas transferências. Ninguém pode criar ou renomear à mão
function nomeReservado(nome: string) {
  const nomeMinusculo = nome.toLowerCase();

  return (
    nomeMinusculo === "transferência enviada" ||
    nomeMinusculo === "transferência recebida"
  );
}

export async function cadastrarCategoria(dados: DadosCategoria) {
  const nomeLimpo = dados.nome.trim();

  if (nomeReservado(nomeLimpo)) {
    return { erro: "NOME DE CATEGORIA RESERVADO PELO SISTEMA" } as const;
  }

  const existe = await prisma.categoria.findUnique({
    where: { nome: nomeLimpo },
  });

  if (existe) {
    return { erro: "CATEGORIA JÁ EXISTE" } as const;
  }

  const categoria = await prisma.categoria.create({
    data: { nome: nomeLimpo, tipo: dados.tipo },
  });

  return { categoria };
}

export async function listarCategoria(
  pagina = 1,
  limite = 10,
  tipo?: TipoCategoria,
) {
  const skip = (pagina - 1) * limite;

  const where: { tipo?: TipoCategoria } = {};

  if (tipo) {
    where.tipo = tipo;
  }

  const categoria = await prisma.categoria.findMany({
    where,
    skip,
    take: limite,
    orderBy: { nome: "asc" },
  });

  const total = await prisma.categoria.count({ where });

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

export async function atualizarCategoria(id: number, dados: DadosCategoria) {
  const existe = await buscarCategoria(id);

  if ("erro" in existe) {
    return existe;
  }

  const nomeLimpo = dados.nome.trim();

  // Categoria do sistema não pode ser editada, e nenhuma pode virar uma delas
  if (nomeReservado(existe.categoria.nome) || nomeReservado(nomeLimpo)) {
    return { erro: "NOME DE CATEGORIA RESERVADO PELO SISTEMA" } as const;
  }

  const outraCategoria = await prisma.categoria.findUnique({
    where: { nome: nomeLimpo },
  });

  if (outraCategoria && outraCategoria.id !== id) {
    return { erro: "CATEGORIA JÁ EXISTE" } as const;
  }

  // Mudar o tipo de uma categoria já usada deixaria os lançamentos errados
  if (dados.tipo !== existe.categoria.tipo) {
    const emUso = await prisma.transacao.count({ where: { categoriaId: id } });

    if (emUso > 0) {
      return { erro: "CATEGORIA EM USO NÃO PODE MUDAR DE TIPO" } as const;
    }
  }

  const categoria = await prisma.categoria.update({
    where: { id },
    data: { nome: nomeLimpo, tipo: dados.tipo },
  });

  return { categoria };
}

export async function deletarCategoria(id: number) {
  const existe = await buscarCategoria(id);

  if ("erro" in existe) {
    return existe;
  }

  const emUso = await prisma.transacao.count({ where: { categoriaId: id } });

  if (emUso > 0) {
    return { erro: "CATEGORIA EM USO" } as const;
  }

  const categoria = await prisma.categoria.delete({
    where: { id },
  });

  return { categoria };
}

// Busca (ou cria) a categoria usada pelas transferências, sempre com o tipo certo
export async function categoriaDoSistema(
  tx: Prisma.TransactionClient,
  nome: "Transferência enviada" | "Transferência recebida",
) {
  const tipo = nome === "Transferência enviada" ? "DESPESA" : "RECEITA";

  const categoria = await tx.categoria.upsert({
    where: { nome },
    update: {},
    create: { nome, tipo },
  });

  if (categoria.tipo === tipo) {
    return categoria;
  }

  // Banco antigo onde alguém usou esse nome com o outro tipo
  const emUso = await tx.transacao.count({
    where: { categoriaId: categoria.id },
  });

  if (emUso > 0) {
    throw new Error(
      `Categoria do sistema "${nome}" está com tipo ${categoria.tipo} e em uso; renomeie-a no banco.`,
    );
  }

  return tx.categoria.update({ where: { id: categoria.id }, data: { tipo } });
}
