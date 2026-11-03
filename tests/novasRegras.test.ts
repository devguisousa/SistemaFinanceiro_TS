import { beforeEach, describe, expect, it } from "vitest";
import { api, apiSemToken, criarCategoria, criarConta } from "./helpers.js";

let contaId: number;
let receitaId: number;
let despesaId: number;

const lancar = (tipo: "RECEITA" | "DESPESA", valor: string, extra = {}) =>
  api()
    .post("/transacao")
    .send({
      descricao: tipo,
      valor,
      tipo,
      contaId,
      categoriaId: tipo === "RECEITA" ? receitaId : despesaId,
      ...extra,
    });

const saldo = async (id = contaId) =>
  (await api().get(`/contas/${id}/saldo`)).body.saldoAtual as string;

beforeEach(async () => {
  contaId = (await criarConta("Principal", "100.00")).id;
  receitaId = (await criarCategoria("Salário", "RECEITA")).id;
  despesaId = (await criarCategoria("Mercado", "DESPESA")).id;
});

describe("Saldo nunca negativo", () => {
  it("bloqueia despesa maior que o saldo", async () => {
    const res = await lancar("DESPESA", "100.01");

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ erro: "SALDO INSUFICIENTE" });
    expect(await saldo()).toBe("100.00");

    expect((await lancar("DESPESA", "100.00")).status).toBe(201);
    expect(await saldo()).toBe("0.00");
  });

  it("bloqueia pagamento sem saldo e não altera a conta a pagar", async () => {
    const cp = (
      await api().post("/contaPagar").send({
        descricao: "Aluguel",
        valorTotal: "500",
        vencimento: "2026-12-10",
      })
    ).body.id;

    const res = await api()
      .post(`/pagamentoPagar/contaPagar/${cp}`)
      .send({ contaId, categoriaId: despesaId, valor: "150" });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ erro: "SALDO INSUFICIENTE" });
    expect((await api().get(`/contaPagar/${cp}`)).body.valorPago).toBe("0.00");
  });

  it("bloqueia editar ou apagar receita que deixaria a conta negativa", async () => {
    const receita = (await lancar("RECEITA", "50")).body.id;
    await lancar("DESPESA", "120");

    expect((await api().delete(`/transacao/${receita}`)).body).toEqual({
      erro: "SALDO INSUFICIENTE",
    });

    const editar = await api().put(`/transacao/${receita}`).send({
      descricao: "menor",
      valor: "10",
      tipo: "RECEITA",
      contaId,
      categoriaId: receitaId,
    });
    expect(editar.status).toBe(409);
  });

  it("bloqueia baixar o saldo inicial abaixo do já gasto", async () => {
    await lancar("DESPESA", "80");

    const res = await api()
      .put(`/contas/${contaId}`)
      .send({ nome: "Principal", saldoInicial: "50" });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ erro: "SALDO INSUFICIENTE" });
  });
});

describe("Categoria com tipo", () => {
  it("lançamento exige categoria do mesmo tipo", async () => {
    const res = await lancar("DESPESA", "10", { categoriaId: receitaId });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ erro: "CATEGORIA NÃO É DO TIPO DA TRANSAÇÃO" });
  });

  it("pagamento exige DESPESA e recebimento exige RECEITA", async () => {
    const cp = (
      await api()
        .post("/contaPagar")
        .send({ descricao: "x", valorTotal: "10", vencimento: "2026-12-10" })
    ).body.id;
    const cr = (
      await api()
        .post("/contaReceber")
        .send({ descricao: "x", valorTotal: "10", vencimento: "2026-12-10" })
    ).body.id;

    const pagamento = await api()
      .post(`/pagamentoPagar/contaPagar/${cp}`)
      .send({ contaId, categoriaId: receitaId, valor: "1" });
    const recebimento = await api()
      .post(`/contaReceber/${cr}/recebimentos`)
      .send({ contaId, categoriaId: despesaId, valor: "1" });

    expect(pagamento.body).toEqual({ erro: "CATEGORIA NÃO É DO TIPO DESPESA" });
    expect(recebimento.body).toEqual({
      erro: "CATEGORIA NÃO É DO TIPO RECEITA",
    });
  });

  it("categoria em uso não muda de tipo nem pode ser apagada", async () => {
    await lancar("RECEITA", "10");

    const mudar = await api()
      .put(`/categoria/${receitaId}`)
      .send({ nome: "Salário", tipo: "DESPESA" });
    expect(mudar.body).toEqual({
      erro: "CATEGORIA EM USO NÃO PODE MUDAR DE TIPO",
    });

    const apagar = await api().delete(`/categoria/${receitaId}`);
    expect(apagar.status).toBe(409);
    expect(apagar.body).toEqual({ erro: "CATEGORIA EM USO" });
  });

  it("filtra categorias por tipo e exige tipo no cadastro", async () => {
    expect((await api().get("/categoria?tipo=DESPESA")).body.total).toBe(1);
    expect(
      (await api().post("/categoria").send({ nome: "Sem tipo" })).status,
    ).toBe(400);
  });
});

describe("Mensagens de exclusão claras", () => {
  it("explica por que não pode apagar", async () => {
    await lancar("RECEITA", "1");
    expect((await api().delete(`/contas/${contaId}`)).body).toEqual({
      erro: "CONTA POSSUI MOVIMENTAÇÕES",
    });

    const cp = (
      await api()
        .post("/contaPagar")
        .send({ descricao: "x", valorTotal: "10", vencimento: "2026-12-10" })
    ).body.id;
    await api()
      .post(`/pagamentoPagar/contaPagar/${cp}`)
      .send({ contaId, categoriaId: despesaId, valor: "1" });
    expect((await api().delete(`/contaPagar/${cp}`)).body).toEqual({
      erro: "CONTA A PAGAR POSSUI PAGAMENTOS",
    });

    const cr = (
      await api()
        .post("/contaReceber")
        .send({ descricao: "x", valorTotal: "10", vencimento: "2026-12-10" })
    ).body.id;
    await api()
      .post(`/contaReceber/${cr}/recebimentos`)
      .send({ contaId, categoriaId: receitaId, valor: "1" });
    expect((await api().delete(`/contaReceber/${cr}`)).body).toEqual({
      erro: "CONTA A RECEBER POSSUI RECEBIMENTOS",
    });
  });

  it("mensagens de não encontrado padronizadas", async () => {
    expect((await api().get("/contaPagar/999")).body).toEqual({
      erro: "CONTA A PAGAR NÃO ENCONTRADA",
    });
    expect((await api().get("/pagamentoPagar/999")).body).toEqual({
      erro: "PAGAMENTO NÃO ENCONTRADO",
    });
  });
});

describe("Transferências", () => {
  it("move o dinheiro com duas transações vinculadas", async () => {
    const destino = (await criarConta("Poupança", "0")).id;

    const res = await api()
      .post("/transferencias")
      .send({ contaOrigemId: contaId, contaDestinoId: destino, valor: "40" });

    expect(res.status).toBe(201);
    expect(res.body.valor).toBe("40.00");
    expect(res.body.transacoes).toHaveLength(2);
    expect(await saldo()).toBe("60.00");
    expect(await saldo(destino)).toBe("40.00");

    // As transações geradas não podem ser editadas diretamente
    const despesa = res.body.transacoes.find(
      (t: { tipo: string }) => t.tipo === "DESPESA",
    );
    expect((await api().delete(`/transacao/${despesa.id}`)).status).toBe(409);

    expect((await api().get("/transferencias")).body.total).toBe(1);
    expect((await api().get(`/transferencias/${res.body.id}`)).status).toBe(
      200,
    );
  });

  it("bloqueia sem saldo, mesma conta e conta inexistente", async () => {
    const destino = (await criarConta("Poupança", "0")).id;

    const semSaldo = await api().post("/transferencias").send({
      contaOrigemId: contaId,
      contaDestinoId: destino,
      valor: "100.01",
    });
    expect(semSaldo.body).toEqual({ erro: "SALDO INSUFICIENTE" });

    const mesma = await api()
      .post("/transferencias")
      .send({ contaOrigemId: contaId, contaDestinoId: contaId, valor: "1" });
    expect(mesma.status).toBe(400);

    const inexistente = await api()
      .post("/transferencias")
      .send({ contaOrigemId: contaId, contaDestinoId: 999, valor: "1" });
    expect(inexistente.status).toBe(404);
    expect(inexistente.body).toEqual({
      erro: "CONTA DE DESTINO NÃO ENCONTRADA",
    });
  });

  it("estorno devolve o dinheiro, mas não se o destino já gastou", async () => {
    const destino = (await criarConta("Poupança", "0")).id;
    const t1 = (
      await api()
        .post("/transferencias")
        .send({ contaOrigemId: contaId, contaDestinoId: destino, valor: "30" })
    ).body.id;

    expect((await api().delete(`/transferencias/${t1}`)).status).toBe(204);
    expect(await saldo()).toBe("100.00");
    expect(await saldo(destino)).toBe("0.00");

    const t2 = (
      await api()
        .post("/transferencias")
        .send({ contaOrigemId: contaId, contaDestinoId: destino, valor: "30" })
    ).body.id;
    await api().post("/transacao").send({
      descricao: "gasto",
      valor: "20",
      tipo: "DESPESA",
      contaId: destino,
      categoriaId: despesaId,
    });

    const estorno = await api().delete(`/transferencias/${t2}`);
    expect(estorno.status).toBe(409);
    expect(estorno.body).toEqual({
      erro: "SALDO INSUFICIENTE NA CONTA DE DESTINO",
    });
  });
});

describe("Data na transação", () => {
  it("aceita data informada e mantém a data ao editar sem informar", async () => {
    const criada = await lancar("RECEITA", "10", { data: "2026-01-15" });
    expect(criada.body.data).toBe("2026-01-15T00:00:00.000Z");

    const comHora = await lancar("RECEITA", "10", {
      data: "2026-02-01T14:30:00-03:00",
    });
    expect(comHora.body.data).toBe("2026-02-01T17:30:00.000Z");

    const editada = await api().put(`/transacao/${criada.body.id}`).send({
      descricao: "editada",
      valor: "11",
      tipo: "RECEITA",
      contaId,
      categoriaId: receitaId,
    });
    expect(editada.body.data).toBe("2026-01-15T00:00:00.000Z");

    expect((await lancar("RECEITA", "1", { data: "2026-02-30" })).status).toBe(
      400,
    );
  });
});

describe("Vencimento", () => {
  it("filtra contas vencidas e não vencidas", async () => {
    const criar = (rota: string, vencimento: string) =>
      api()
        .post(rota)
        .send({ descricao: vencimento, valorTotal: "10", vencimento });

    await criar("/contaPagar", "2020-01-01");
    await criar("/contaPagar", "2099-01-01");
    await criar("/contaReceber", "2020-01-01");

    const vencidas = await api().get("/contaPagar?vencidas=true");
    expect(vencidas.body.total).toBe(1);
    expect(vencidas.body.contaPagar[0].descricao).toBe("2020-01-01");

    expect((await api().get("/contaPagar?vencidas=false")).body.total).toBe(1);
    expect((await api().get("/contaReceber?vencidas=true")).body.total).toBe(1);
    expect((await api().get("/contaReceber?status=RECEBIDA")).body.total).toBe(
      0,
    );
    expect((await api().get("/contaPagar?vencidas=talvez")).status).toBe(400);
  });
});

describe("Formato do dinheiro", () => {
  it("sempre com 2 casas", async () => {
    const conta = await api()
      .post("/contas")
      .send({ nome: "X", saldoInicial: "10" });
    expect(conta.body.saldoInicial).toBe("10.00");

    const transacao = await lancar("RECEITA", "5.5");
    expect(transacao.body.valor).toBe("5.50");
  });
});

describe("Concorrência", () => {
  it("8 pagamentos simultâneos: nenhum 500 e valores corretos", async () => {
    await lancar("RECEITA", "1000");
    const cp = (
      await api()
        .post("/contaPagar")
        .send({ descricao: "C", valorTotal: "100", vencimento: "2026-12-10" })
    ).body.id;

    const respostas = await Promise.all(
      Array.from({ length: 8 }, () =>
        api()
          .post(`/pagamentoPagar/contaPagar/${cp}`)
          .send({ contaId, categoriaId: despesaId, valor: "20" }),
      ),
    );

    const status = respostas.map((r) => r.status);
    expect(status).not.toContain(500);

    const aprovados = status.filter((s) => s === 201).length;
    expect(aprovados).toBeLessThanOrEqual(5);

    const final = (await api().get(`/contaPagar/${cp}`)).body;
    expect(Number(final.valorPago)).toBe(aprovados * 20);
    expect(
      (await api().get(`/pagamentoPagar/contaPagar/${cp}`)).body.total,
    ).toBe(aprovados);
  });
});

describe("Entradas maliciosas", () => {
  it("ids fora do INT4, em notação científica ou hexadecimal dão 400", async () => {
    for (const rota of [
      "/contas/3000000000",
      "/contaReceber/3000000000",
      "/contaReceber/1e3",
      "/contaReceber/0x10",
      "/recebimentos/9999999999",
    ]) {
      expect((await api().get(rota)).status, rota).toBe(400);
    }

    expect(
      (await lancar("RECEITA", "1", { contaId: 3_000_000_000 })).status,
    ).toBe(400);
  });

  it("página acima de 10000 dá 400", async () => {
    expect((await api().get("/contas?page=10001")).status).toBe(400);
    expect((await api().get("/contaReceber?pagina=99999999999")).status).toBe(
      400,
    );
  });

  it("body grande dá 413 e charset inválido dá 415", async () => {
    const grande = await api()
      .post("/contas")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ nome: "a".repeat(200_000) }));
    expect(grande.status).toBe(413);

    const charset = await api()
      .post("/contas")
      .set("Content-Type", "application/json; charset=xpto")
      .send('{"nome":"a"}');
    expect(charset.status).toBe(415);
  });

  it("mensagens do Zod em português", async () => {
    const res = await api().post("/contas").send({});

    expect(res.body.detalhes[0].message).not.toMatch(/Invalid input/);
  });
});

describe("Infra", () => {
  it("/health é público e não expõe X-Powered-By", async () => {
    const res = await apiSemToken().get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("Ataques da 2ª rodada (regressão)", () => {
  it("10 despesas e 10 transferências simultâneas: nenhum 500 e saldo nunca negativo", async () => {
    const destino = (await criarConta("Destino", "0")).id;

    const transferencias = await Promise.all(
      Array.from({ length: 10 }, () =>
        api()
          .post("/transferencias")
          .send({
            contaOrigemId: contaId,
            contaDestinoId: destino,
            valor: "20",
          }),
      ),
    );
    const despesas = await Promise.all(
      Array.from({ length: 10 }, () =>
        api()
          .post("/transacao")
          .send({
            descricao: "d",
            valor: "15",
            tipo: "DESPESA",
            contaId: destino,
            categoriaId: despesaId,
          }),
      ),
    );

    for (const r of [...transferencias, ...despesas]) {
      expect([201, 409]).toContain(r.status);
    }

    expect(Number(await saldo())).toBeGreaterThanOrEqual(0);
    expect(Number(await saldo(destino))).toBeGreaterThanOrEqual(0);
  });

  it("dois ADMINs rebaixando um ao outro ao mesmo tempo: sobra pelo menos um", async () => {
    const { criarUsuarioLogado, apiCom } = await import("./helpers.js");
    const { prisma } = await import("../src/prisma.js");

    const outro = await criarUsuarioLogado("admin2@x.com", "ADMIN");
    const padrao = (await prisma.usuario.findUnique({
      where: { email: "admin@teste.com" },
    }))!.id;

    const respostas = await Promise.all([
      api().patch(`/usuarios/${outro.id}/papel`).send({ papel: "USUARIO" }),
      apiCom(outro.accessToken)
        .patch(`/usuarios/${padrao}/papel`)
        .send({ papel: "USUARIO" }),
    ]);

    for (const r of respostas) {
      expect([200, 403, 409]).toContain(r.status);
    }
    expect(
      await prisma.usuario.count({ where: { papel: "ADMIN" } }),
    ).toBeGreaterThanOrEqual(1);
  });

  it("byte nulo no texto dá 400 (antes 500)", async () => {
    const res = await api().post("/contas").send({ nome: "x\u0000y" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ erro: "CARACTERE INVÁLIDO NA REQUISIÇÃO" });
  });

  it("nomes das categorias de transferência são reservados", async () => {
    const criar = await api()
      .post("/categoria")
      .send({ nome: "transferência ENVIADA", tipo: "RECEITA" });
    expect(criar.status).toBe(409);
    expect(criar.body).toEqual({
      erro: "NOME DE CATEGORIA RESERVADO PELO SISTEMA",
    });

    const renomear = await api()
      .put(`/categoria/${receitaId}`)
      .send({ nome: "Transferência recebida", tipo: "RECEITA" });
    expect(renomear.status).toBe(409);
  });
});
