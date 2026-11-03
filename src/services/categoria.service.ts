import { prisma } from "../prisma.js";

type TipoCategoria = "RECEITA" | "DESPESA";

// Usadas automaticamente pelas transferências: não podem ser criadas/renomeadas à mão
export const CATEGORIAS_DO_SISTEMA = {
  "Transferência enviada": "DESPESA",
  "Transferência recebida": "RECEITA",
} as const;

function nomeReservado(nome: string) {
  return Object.keys(CATEGORIAS_DO_SISTEMA).some(
    (reservado) => reservado.toLowerCase() === nome.toLowerCase(),
  );
}

type DadosCategoria = {
  nome: string;
  tipo: TipoCategoria;
};

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

  const where = tipo ? { tipo } : {};

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

  // Categorias do sistema não podem ser editadas, e nenhuma pode virar uma delas
  if (nomeReservado(existe.categoria.nome) || nomeReservado(nomeLimpo)) {
    return { erro: "NOME DE CATEGORIA RESERVADO PELO SISTEMA" } as const;
  }

  const outraCategoria = await prisma.categoria.findUnique({
    where: { nome: nomeLimpo },
  });

  if (outraCategoria && outraCategoria.id !== id) {
    return { erro: "CATEGORIA JÁ EXISTE" } as const;
  }

  // Trocar o tipo de uma categoria em uso deixaria lançamentos inconsistentes
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

/** Busca (ou cria) uma categoria do sistema, garantindo o tipo certo. */
export async function categoriaDoSistema(
  tx: Pick<typeof prisma, "categoria" | "transacao">,
  nome: keyof typeof CATEGORIAS_DO_SISTEMA,
) {
  const tipo = CATEGORIAS_DO_SISTEMA[nome];

  const categoria = await tx.categoria.upsert({
    where: { nome },
    update: {},
    create: { nome, tipo },
  });

  if (categoria.tipo === tipo) {
    return categoria;
  }

  // Base antiga com o nome reservado usado com outro tipo
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
