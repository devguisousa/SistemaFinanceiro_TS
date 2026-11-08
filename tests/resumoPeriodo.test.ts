import { beforeEach, describe, expect, it } from "vitest";
import {
  api,
  apiCom,
  criarCategoria,
  criarConta,
  criarUsuarioLogado,
} from "./helpers.js";

let contaId: number;
let outraContaId: number;
let salarioId: number;
let moradiaId: number;
let mercadoId: number;

const lancar = (
  categoriaId: number,
  tipo: "RECEITA" | "DESPESA",
  valor: string,
  data: string,
) =>
  api()
    .post("/transacao")
    .send({ descricao: `${tipo} ${valor}`, valor, tipo, contaId, categoriaId, data });

const resumo = (query: string) => api().get(`/transacao/resumo?${query}`);

beforeEach(async () => {
  contaId = (await criarConta("Principal", "5000.00")).id;
  outraContaId = (await criarConta("Reserva", "0.00")).id;
  salarioId = (await criarCategoria("Salário", "RECEITA")).id;
  moradiaId = (await criarCategoria("Moradia", "DESPESA")).id;
  mercadoId = (await criarCategoria("Mercado", "DESPESA")).id;

  await lancar(salarioId, "RECEITA", "3000", "2026-10-31T23:00:00-03:00"); // fora
  await lancar(salarioId, "RECEITA", "4000", "2026-11-05T09:00:00-03:00");
  await lancar(moradiaId, "DESPESA", "1500", "2026-11-10T12:00:00-03:00");
  await lancar(mercadoId, "DESPESA", "200.50", "2026-11-12T12:00:00-03:00");
  await lancar(mercadoId, "DESPESA", "99.50", "2026-11-30T23:30:00-03:00");
  await lancar(mercadoId, "DESPESA", "80", "2026-12-01T00:30:00-03:00"); // fora
});

const novembro =
  "inicio=2026-11-01T00:00:00-03:00&fim=2026-11-30T23:59:59.999-03:00";

describe("Resumo de receitas e despesas por período", () => {
  it("soma receitas, despesas e resultado só dentro do período", async () => {
    const res = await resumo(novembro);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      receitas: "4000.00",
      despesas: "1800.00",
      resultado: "2200.00",
      qtdReceitas: 1,
      qtdDespesas: 3,
    });
  });

  it("separa por categoria, do maior total para o menor", async () => {
    const res = await resumo(novembro);

    expect(res.body.porCategoria).toEqual([
      {
        categoriaId: salarioId,
        nome: "Salário",
        tipo: "RECEITA",
        total: "4000.00",
        quantidade: 1,
      },
      {
        categoriaId: moradiaId,
        nome: "Moradia",
        tipo: "DESPESA",
        total: "1500.00",
        quantidade: 1,
      },
      {
        categoriaId: mercadoId,
        nome: "Mercado",
        tipo: "DESPESA",
        total: "300.00",
        quantidade: 2,
      },
    ]);
  });

  it("aceita datas AAAA-MM-DD: o dia final entra inteiro (UTC)", async () => {
    const res = await resumo("inicio=2026-11-10&fim=2026-11-12");

    expect(res.body).toMatchObject({
      receitas: "0.00",
      despesas: "1700.50",
      resultado: "-1700.50",
    });
  });

  it("período sem lançamentos vem zerado", async () => {
    const res = await resumo("inicio=2025-01-01&fim=2025-01-31");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      receitas: "0.00",
      despesas: "0.00",
      resultado: "0.00",
      qtdReceitas: 0,
      qtdDespesas: 0,
      porCategoria: [],
    });
  });

  it("transferência entre contas não conta como receita nem despesa", async () => {
    const t = await api().post("/transferencias").send({
      contaOrigemId: contaId,
      contaDestinoId: outraContaId,
      valor: "500",
    });
    expect(t.status).toBe(201);

    const hoje = new Date();
    const inicio = new Date(hoje.getTime() - 60_000).toISOString();
    const fim = new Date(hoje.getTime() + 60_000).toISOString();
    const res = await resumo(`inicio=${inicio}&fim=${fim}`);

    expect(res.body).toMatchObject({
      receitas: "0.00",
      despesas: "0.00",
      porCategoria: [],
    });
  });

  it("não mistura os lançamentos de outro usuário", async () => {
    const outro = apiCom((await criarUsuarioLogado("outro@x.com")).accessToken);

    const res = await outro.get(`/transacao/resumo?${novembro}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      receitas: "0.00",
      despesas: "0.00",
      porCategoria: [],
    });
  });

  it("exige início e fim válidos, com o início antes do fim", async () => {
    expect((await resumo("inicio=2026-11-01")).status).toBe(400);
    expect((await resumo("fim=2026-11-01")).status).toBe(400);
    expect((await resumo("inicio=ontem&fim=hoje")).status).toBe(400);
    expect((await resumo("inicio=2026-02-30&fim=2026-03-01")).status).toBe(400);

    const invertido = await resumo("inicio=2026-11-30&fim=2026-11-01");
    expect(invertido.status).toBe(400);
    expect(invertido.body.erro).toBe("PARÂMETROS INVÁLIDOS");
  });
});

describe("Listagem de transações filtrada por período", () => {
  it("devolve só os lançamentos entre início e fim", async () => {
    const res = await api().get(`/transacao?${novembro}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(4);
    expect(res.body.transacao.map((t: { valor: string }) => t.valor)).toEqual([
      "99.50",
      "200.50",
      "1500.00",
      "4000.00",
    ]);
  });

  it("aceita só o início ou só o fim", async () => {
    const desde = await api().get("/transacao?inicio=2026-11-30T00:00:00-03:00");
    expect(desde.body.total).toBe(2);

    const ate = await api().get("/transacao?fim=2026-10-31T23:59:59-03:00");
    expect(ate.body.total).toBe(1);
  });

  it("recusa período invertido", async () => {
    const res = await api().get("/transacao?inicio=2026-11-30&fim=2026-11-01");
    expect(res.status).toBe(400);
  });
});
