import { beforeEach, describe, expect, it } from "vitest";
import { api, criarCategoria, criarConta } from "./helpers.js";

let contaId: number;
let receitaId: number;
let despesaId: number;

const lancar = (tipo: "RECEITA" | "DESPESA", valor: string, conta = contaId) =>
  api()
    .post("/transacao")
    .send({
      descricao: tipo,
      valor,
      tipo,
      contaId: conta,
      categoriaId: tipo === "RECEITA" ? receitaId : despesaId,
    });

const buscarSaldo = async (id = contaId) =>
  (await api().get(`/contas/${id}/saldo`)).body;

const definirSaldo = (saldoAtual: string, id = contaId) =>
  api().put(`/contas/${id}`).send({ nome: "Principal", saldoAtual });

async function pagar(valor: string) {
  const cp = await api().post("/contaPagar").send({
    descricao: "Luz",
    valorTotal: "500",
    vencimento: "2026-12-10",
  });

  return api()
    .post(`/pagamentoPagar/contaPagar/${cp.body.id}`)
    .send({ contaId, categoriaId: despesaId, valor });
}

beforeEach(async () => {
  contaId = (await criarConta("Principal", "1000.00")).id;
  receitaId = (await criarCategoria("Salário", "RECEITA")).id;
  despesaId = (await criarCategoria("Contas", "DESPESA")).id;
});

describe("Saldo digitado na edição da conta", () => {
  it("vira o saldo, sem descontar o que já foi pago ou recebido", async () => {
    expect((await pagar("200")).status).toBe(201);
    await lancar("RECEITA", "50");
    expect((await buscarSaldo()).saldoAtual).toBe("850.00");

    const res = await definirSaldo("1000");
    expect(res.status).toBe(200);
    expect(res.body.saldoInicial).toBe("1000.00");
    expect(res.body.saldoDefinidoEm).not.toBeNull();

    const saldo = await buscarSaldo();
    expect(saldo).toMatchObject({
      saldoInicial: "1000.00",
      totalReceitas: "0.00",
      totalDespesas: "0.00",
      saldoAtual: "1000.00",
    });
    expect(saldo.saldoDefinidoEm).toEqual(res.body.saldoDefinidoEm);
  });

  it("pagamentos e recebimentos lançados depois continuam mexendo no saldo", async () => {
    await pagar("200");
    await definirSaldo("1000");

    expect((await pagar("300")).status).toBe(201);
    await lancar("RECEITA", "25.50");

    expect(await buscarSaldo()).toMatchObject({
      totalReceitas: "25.50",
      totalDespesas: "300.00",
      saldoAtual: "725.50",
    });
  });

  it("sem edição do saldo, os pagamentos continuam descontando", async () => {
    await pagar("200");

    // Só trocou o nome: o saldo segue calculado com tudo
    const res = await api().put(`/contas/${contaId}`).send({ nome: "Novo" });
    expect(res.status).toBe(200);
    expect(res.body.saldoDefinidoEm).toBeNull();

    expect((await buscarSaldo()).saldoAtual).toBe("800.00");
  });

  it("saldo igual ao atual não muda nada", async () => {
    await pagar("200");

    const res = await definirSaldo("800.00");
    expect(res.status).toBe(200);
    expect(res.body.saldoDefinidoEm).toBeNull();
    expect((await buscarSaldo()).totalDespesas).toBe("200.00");
  });

  it("vale só para a conta editada", async () => {
    const outra = (await criarConta("Outra", "100.00")).id;
    await lancar("DESPESA", "40", outra);

    await definirSaldo("1000");
    await lancar("DESPESA", "10", outra);

    expect((await buscarSaldo(outra)).saldoAtual).toBe("50.00");
  });

  it("aceita zero e recusa valor inválido", async () => {
    expect((await definirSaldo("0")).status).toBe(200);
    expect((await buscarSaldo()).saldoAtual).toBe("0.00");

    const invalido = await definirSaldo("-5");
    expect(invalido.status).toBe(400);
    expect(invalido.body.erro).toBe("DADOS INVÁLIDOS");
  });

  it("depois de definido, o saldo continua sem poder ficar negativo", async () => {
    await definirSaldo("100");

    const res = await lancar("DESPESA", "100.01");
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ erro: "SALDO INSUFICIENTE" });
  });
});
