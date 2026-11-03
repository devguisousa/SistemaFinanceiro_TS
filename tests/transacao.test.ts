import { beforeEach, describe, expect, it } from "vitest";
import { api, criarCategoria, criarConta } from "./helpers.js";

let contaId: number;
let categoriaId: number;

async function criarTransacao(
  descricao: string,
  tipo: "RECEITA" | "DESPESA",
  extra = {},
) {
  const res = await api()
    .post("/transacao")
    .send({ descricao, valor: "10.00", tipo, contaId, categoriaId, ...extra });
  return res;
}

describe("Transações", () => {
  beforeEach(async () => {
    contaId = (await criarConta()).id;
    categoriaId = (await criarCategoria()).id;
  });

  it("cadastra, busca, atualiza e deleta", async () => {
    const criada = await criarTransacao("Café", "DESPESA");
    expect(criada.status).toBe(201);

    const id = criada.body.id;

    expect((await api().get(`/transacao/${id}`)).status).toBe(200);

    const atualizada = await api().put(`/transacao/${id}`).send({
      descricao: "Café 2",
      valor: "12.00",
      tipo: "DESPESA",
      contaId,
      categoriaId,
    });
    expect(atualizada.status).toBe(200);
    expect(atualizada.body.descricao).toBe("Café 2");

    expect((await api().delete(`/transacao/${id}`)).status).toBe(204);

    const removida = await api().get(`/transacao/${id}`);
    expect(removida.status).toBe(404);
    expect(removida.body).toEqual({ erro: "TRANSAÇÃO NÃO ENCONTRADA" });
  });

  it("responde 404 para conta ou categoria inexistente", async () => {
    const semConta = await criarTransacao("x", "RECEITA", { contaId: 999 });
    expect(semConta.status).toBe(404);
    expect(semConta.body).toEqual({ erro: "CONTA NÃO ENCONTRADA" });

    const semCategoria = await criarTransacao("x", "RECEITA", {
      categoriaId: 999,
    });
    expect(semCategoria.status).toBe(404);
    expect(semCategoria.body).toEqual({ erro: "CATEGORIA NÃO ENCONTRADA" });
  });

  it("pagina sem pular registros (bug do skip * 3)", async () => {
    for (let i = 1; i <= 5; i++) await criarTransacao(`T${i}`, "RECEITA");

    const pagina1 = await api().get("/transacao?page=1&limit=2");
    const pagina2 = await api().get("/transacao?page=2&limit=2");
    const pagina3 = await api().get("/transacao?page=3&limit=2");

    const ids = [
      ...pagina1.body.transacao,
      ...pagina2.body.transacao,
      ...pagina3.body.transacao,
    ].map((t: { id: number }) => t.id);

    expect(new Set(ids).size).toBe(5);
    expect(pagina3.body.transacao).toHaveLength(1);
    expect(pagina1.body.totalPaginas).toBe(3);
  });

  it("filtra por tipo, conta e categoria", async () => {
    const outraCategoria = (await criarCategoria("Outra")).id;

    await criarTransacao("R1", "RECEITA");
    await criarTransacao("D1", "DESPESA");
    await criarTransacao("R2", "RECEITA", { categoriaId: outraCategoria });

    const receitas = await api().get("/transacao?tipo=RECEITA");
    expect(receitas.body.total).toBe(2);

    const porCategoria = await api().get(
      `/transacao?categoriaId=${outraCategoria}`,
    );
    expect(porCategoria.body.total).toBe(1);
    expect(porCategoria.body.transacao[0].descricao).toBe("R2");

    const porConta = await api().get(`/transacao?contaId=${contaId}`);
    expect(porConta.body.total).toBe(3);
  });

  it("busca receita/despesa por id respeitando o tipo", async () => {
    const receita = (await criarTransacao("R", "RECEITA")).body.id;

    expect((await api().get(`/transacao/receitas/${receita}`)).status).toBe(
      200,
    );

    const comoDespesa = await api().get(`/transacao/despesas/${receita}`);
    expect(comoDespesa.status).toBe(404);
    expect(comoDespesa.body).toEqual({ erro: "DESPESA NÃO ENCONTRADA" });
  });

  it("lista receitas e despesas por conta com paginação", async () => {
    for (let i = 1; i <= 3; i++) await criarTransacao(`R${i}`, "RECEITA");
    await criarTransacao("D1", "DESPESA");

    const receitas = await api().get(
      `/transacao/${contaId}/receitas?page=2&limit=2`,
    );
    expect(receitas.status).toBe(200);
    expect(receitas.body.total).toBe(3);
    expect(receitas.body.transacao).toHaveLength(1);

    const despesas = await api().get(`/transacao/${contaId}/despesas`);
    expect(despesas.body.total).toBe(1);

    expect((await api().get("/transacao/999/receitas")).status).toBe(404);
  });
});
