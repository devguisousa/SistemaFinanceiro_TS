import { beforeEach, describe, expect, it } from "vitest";
import { api, criarCategoria, criarConta } from "./helpers.js";

let contaId: number;
let categoriaId: number;

async function criarContaReceber(valorTotal = "200.00") {
  const res = await api()
    .post("/contaReceber")
    .send({ descricao: "Freela", valorTotal, vencimento: "2026-12-20" });
  return res;
}

function receber(contaReceberId: number, valor: string, extra = {}) {
  return api()
    .post(`/contaReceber/${contaReceberId}/recebimentos`)
    .send({ contaId, categoriaId, valor, ...extra });
}

describe("Contas a receber", () => {
  beforeEach(async () => {
    contaId = (await criarConta("Banco", "0.00")).id;
    categoriaId = (await criarCategoria("Serviços", "RECEITA")).id;
  });

  it("cadastra, lista, busca, atualiza e deleta", async () => {
    const criada = await criarContaReceber();
    expect(criada.status).toBe(201);
    expect(criada.body.status).toBe("PENDENTE");

    const id = criada.body.id;

    const lista = await api().get("/contaReceber?pagina=1&limite=5");
    expect(lista.status).toBe(200);
    expect(lista.body.total).toBe(1);

    expect((await api().get(`/contaReceber/${id}`)).status).toBe(200);

    const atualizada = await api().put(`/contaReceber/${id}`).send({
      descricao: "Freela 2",
      valorTotal: "250.00",
      vencimento: "2026-12-21",
    });
    expect(atualizada.status).toBe(200);
    expect(atualizada.body.descricao).toBe("Freela 2");

    expect((await api().delete(`/contaReceber/${id}`)).status).toBe(204);
    expect((await api().get(`/contaReceber/${id}`)).status).toBe(404);
  });

  it("id inválido responde { erro, detalhes } sem vazar o ZodError", async () => {
    const res = await api().get("/contaReceber/abc");

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe("ID INVÁLIDO");
    expect(Array.isArray(res.body.detalhes)).toBe(true);
  });

  it("recebimento parcial, total e bloqueios", async () => {
    const id = (await criarContaReceber("200.00")).body.id;

    const parcial = await receber(id, "50.00");
    expect(parcial.status).toBe(201);
    expect(parcial.body.contaReceber.status).toBe("PARCIALMENTE_RECEBIDA");
    expect(parcial.body.transacao.tipo).toBe("RECEITA");

    const excedente = await receber(id, "150.01");
    expect(excedente.status).toBe(409);
    expect(excedente.body).toEqual({
      erro: "RECEBIMENTO MAIOR QUE O SALDO PENDENTE",
    });

    const total = await receber(id, "150.00");
    expect(total.status).toBe(201);
    expect(total.body.contaReceber.status).toBe("RECEBIDA");

    const jaRecebida = await receber(id, "1.00");
    expect(jaRecebida.status).toBe(409);
    expect(jaRecebida.body).toEqual({ erro: "CONTA JÁ RECEBIDA" });

    const saldo = await api().get(`/contas/${contaId}/saldo`);
    expect(saldo.body.saldoAtual).toBe("200.00");

    const daConta = await api().get(`/contaReceber/${id}/recebimentos`);
    expect(daConta.status).toBe(200);
    expect(daConta.body.total).toBe(2);

    const todos = await api().get("/recebimentos");
    expect(todos.body.total).toBe(2);

    const um = await api().get(`/recebimentos/${parcial.body.recebimento.id}`);
    expect(um.status).toBe(200);
  });

  it("recebimento responde 404 para registros inexistentes", async () => {
    const id = (await criarContaReceber()).body.id;

    expect((await receber(999, "10")).body).toEqual({
      erro: "CONTA A RECEBER NÃO ENCONTRADA",
    });
    expect((await receber(id, "10", { contaId: 999 })).body).toEqual({
      erro: "CONTA BANCÁRIA NÃO ENCONTRADA",
    });
    expect((await receber(id, "10", { categoriaId: 999 })).body).toEqual({
      erro: "CATEGORIA NÃO ENCONTRADA",
    });
    expect((await api().get("/recebimentos/999")).status).toBe(404);
    expect((await api().get("/contaReceber/999/recebimentos")).status).toBe(
      404,
    );
  });

  it("valida o valor do recebimento", async () => {
    const id = (await criarContaReceber()).body.id;

    const zero = await receber(id, "0");
    expect(zero.status).toBe(400);
    expect(zero.body.erro).toBe("DADOS INVÁLIDOS");
  });
});
