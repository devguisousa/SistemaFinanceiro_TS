import { describe, expect, it } from "vitest";
import { api, criarCategoria } from "./helpers.js";

describe("Categorias", () => {
  it("cadastra e impede nome duplicado (409)", async () => {
    const criada = await api().post("/categoria").send({ nome: "Lazer" });
    expect(criada.status).toBe(201);

    const duplicada = await api().post("/categoria").send({ nome: " Lazer " });
    expect(duplicada.status).toBe(409);
    expect(duplicada.body).toEqual({ erro: "CATEGORIA JÁ EXISTE" });
  });

  it("lista com dados de paginação", async () => {
    await criarCategoria("B");
    await criarCategoria("A");
    await criarCategoria("C");

    const res = await api().get("/categoria?page=1&limit=2");

    expect(res.status).toBe(200);
    expect(res.body.categoria.map((c: { nome: string }) => c.nome)).toEqual([
      "A",
      "B",
    ]);
    expect(res.body.total).toBe(3);
    expect(res.body.totalPaginas).toBe(2);
  });

  it("atualizar responde 404 e 409 com a mensagem certa", async () => {
    const a = await criarCategoria("A");
    await criarCategoria("B");

    const naoExiste = await api().put("/categoria/999").send({ nome: "X" });
    expect(naoExiste.status).toBe(404);
    expect(naoExiste.body).toEqual({ erro: "CATEGORIA NÃO ENCONTRADA" });

    const conflito = await api().put(`/categoria/${a.id}`).send({ nome: "B" });
    expect(conflito.status).toBe(409);
    expect(conflito.body).toEqual({ erro: "CATEGORIA JÁ EXISTE" });

    const ok = await api().put(`/categoria/${a.id}`).send({ nome: "A2" });
    expect(ok.status).toBe(200);
    expect(ok.body.nome).toBe("A2");
  });

  it("deleta", async () => {
    const c = await criarCategoria();

    expect((await api().delete(`/categoria/${c.id}`)).status).toBe(204);
    expect((await api().get(`/categoria/${c.id}`)).status).toBe(404);
  });
});
