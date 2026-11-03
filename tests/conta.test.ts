import { describe, expect, it } from "vitest";
import { api, criarCategoria, criarConta } from "./helpers.js";

describe("Contas", () => {
  it("cadastra, busca, atualiza e deleta", async () => {
    const criada = await api()
      .post("/contas")
      .send({ nome: "  Nubank  ", saldoInicial: "150.50" });

    expect(criada.status).toBe(201);
    expect(criada.body.nome).toBe("Nubank");

    const id = criada.body.id;

    const busca = await api().get(`/contas/${id}`);
    expect(busca.status).toBe(200);
    expect(Number(busca.body.saldoInicial)).toBe(150.5);

    const atualizada = await api()
      .put(`/contas/${id}`)
      .send({ nome: "Inter", saldoInicial: "10" });
    expect(atualizada.status).toBe(200);
    expect(atualizada.body.nome).toBe("Inter");

    expect((await api().delete(`/contas/${id}`)).status).toBe(204);
    expect((await api().get(`/contas/${id}`)).status).toBe(404);
  });

  it("usa saldo inicial 0.00 quando não informado", async () => {
    const res = await api().post("/contas").send({ nome: "Carteira" });

    expect(res.status).toBe(201);
    expect(Number(res.body.saldoInicial)).toBe(0);
  });

  it("valida body e id com { erro, detalhes }", async () => {
    const body = await api().post("/contas").send({ nome: "" });
    expect(body.status).toBe(400);
    expect(body.body.erro).toBe("DADOS INVÁLIDOS");
    expect(Array.isArray(body.body.detalhes)).toBe(true);

    const id = await api().get("/contas/abc");
    expect(id.status).toBe(400);
    expect(id.body.erro).toBe("ID INVÁLIDO");
  });

  it("pagina a listagem", async () => {
    for (let i = 1; i <= 3; i++) await criarConta(`Conta ${i}`);

    const res = await api().get("/contas?page=2&limit=2");

    expect(res.status).toBe(200);
    expect(res.body.contas).toHaveLength(1);
    expect(res.body.contas[0].nome).toBe("Conta 3");
    expect(res.body.total).toBe(3);
    expect(res.body.totalPaginas).toBe(2);
  });

  it("calcula o saldo atual em GET /contas/:id/saldo", async () => {
    const conta = await criarConta("Saldo", "100.00");
    const receita = await criarCategoria("Salário", "RECEITA");
    const despesa = await criarCategoria("Mercado", "DESPESA");

    const base = { contaId: conta.id };
    await api()
      .post("/transacao")
      .send({
        ...base,
        categoriaId: receita.id,
        descricao: "Salário",
        valor: "50.25",
        tipo: "RECEITA",
      });
    await api()
      .post("/transacao")
      .send({
        ...base,
        categoriaId: despesa.id,
        descricao: "Mercado",
        valor: "20.00",
        tipo: "DESPESA",
      });

    const res = await api().get(`/contas/${conta.id}/saldo`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      contaId: conta.id,
      saldoInicial: "100.00",
      totalReceitas: "50.25",
      totalDespesas: "20.00",
      saldoAtual: "130.25",
    });
  });

  it("saldo de conta inexistente responde 404", async () => {
    const res = await api().get("/contas/999/saldo");
    expect(res.status).toBe(404);
  });

  it("não deleta conta com transações (409)", async () => {
    const conta = await criarConta();
    const categoria = await criarCategoria();
    await api().post("/transacao").send({
      descricao: "x",
      valor: "1",
      tipo: "RECEITA",
      contaId: conta.id,
      categoriaId: categoria.id,
    });

    const res = await api().delete(`/contas/${conta.id}`);
    expect(res.status).toBe(409);
  });
});
