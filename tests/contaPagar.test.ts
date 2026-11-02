import { beforeEach, describe, expect, it } from "vitest";
import { api, criarCategoria, criarConta } from "./helpers.js";

let contaId: number;
let categoriaId: number;

async function criarContaPagar(valorTotal = "100.00") {
  const res = await api()
    .post("/contaPagar")
    .send({ descricao: "Aluguel", valorTotal, vencimento: "2026-12-10" });
  return res;
}

function pagar(contaPagarId: number, valor: string, extra = {}) {
  return api()
    .post(`/pagamentoPagar/contaPagar/${contaPagarId}`)
    .send({ contaId, categoriaId, valor, ...extra });
}

describe("Contas a pagar", () => {
  beforeEach(async () => {
    contaId = (await criarConta("Banco", "500.00")).id;
    categoriaId = (await criarCategoria("Moradia")).id;
  });

  it("cadastra, lista, atualiza e deleta", async () => {
    const criada = await criarContaPagar();
    expect(criada.status).toBe(201);
    expect(criada.body.status).toBe("PENDENTE");

    const id = criada.body.id;

    const lista = await api().get("/contaPagar?status=PENDENTE");
    expect(lista.body.total).toBe(1);

    const atualizada = await api()
      .put(`/contaPagar/${id}`)
      .send({
        descricao: "Aluguel novo",
        valorTotal: "120.00",
        vencimento: "2026-12-15",
      });
    expect(atualizada.status).toBe(200);

    expect((await api().delete(`/contaPagar/${id}`)).status).toBe(204);

    const removida = await api().get(`/contaPagar/${id}`);
    expect(removida.status).toBe(404);
    expect(removida.body).toEqual({ erro: "CONTA A PAGAR NÃO EXISTE" });
  });

  it("rejeita data inválida", async () => {
    const res = await api()
      .post("/contaPagar")
      .send({ descricao: "x", valorTotal: "10", vencimento: "2026-02-30" });

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe("DADOS INVÁLIDOS");
  });

  it("pagamento parcial, total e bloqueios", async () => {
    const id = (await criarContaPagar("100.00")).body.id;

    const parcial = await pagar(id, "40.00");
    expect(parcial.status).toBe(201);
    expect(parcial.body.contaPagar.status).toBe("PARCIALMENTE_PAGA");
    expect(parcial.body.transacao.tipo).toBe("DESPESA");

    const excedente = await pagar(id, "60.01");
    expect(excedente.status).toBe(409);
    expect(excedente.body).toEqual({
      erro: "PAGAMENTO MAIOR QUE O SALDO PENDENTE",
    });

    const total = await pagar(id, "60.00");
    expect(total.status).toBe(201);
    expect(total.body.contaPagar.status).toBe("PAGA");
    expect(Number(total.body.contaPagar.valorPago)).toBe(100);

    const quitada = await pagar(id, "1.00");
    expect(quitada.status).toBe(409);
    expect(quitada.body).toEqual({ erro: "CONTA JÁ QUITADA" });

    const saldo = await api().get(`/contas/${contaId}/saldo`);
    expect(saldo.body.saldoAtual).toBe("400.00");

    const pagamentos = await api().get(`/pagamentoPagar/contaPagar/${id}`);
    expect(pagamentos.status).toBe(200);
    expect(pagamentos.body.total).toBe(2);

    const todos = await api().get("/pagamentoPagar");
    expect(todos.body.total).toBe(2);

    const um = await api().get(`/pagamentoPagar/${parcial.body.pagamento.id}`);
    expect(um.status).toBe(200);
  });

  it("pagamento responde 404 para registros inexistentes", async () => {
    const id = (await criarContaPagar()).body.id;

    expect((await pagar(999, "10")).body).toEqual({
      erro: "CONTA A PAGAR NÃO ENCONTRADA",
    });
    expect((await pagar(id, "10", { contaId: 999 })).body).toEqual({
      erro: "CONTA BANCÁRIA NÃO ENCONTRADA",
    });
    expect((await pagar(id, "10", { categoriaId: 999 })).body).toEqual({
      erro: "CATEGORIA NÃO ENCONTRADA",
    });
    expect((await pagar(id, "10", { categoriaId: 999 })).status).toBe(404);
    expect((await api().get("/pagamentoPagar/999")).status).toBe(404);
  });

  it("valida o valor do pagamento", async () => {
    const id = (await criarContaPagar()).body.id;

    const zero = await pagar(id, "0");
    expect(zero.status).toBe(400);
    expect(zero.body.erro).toBe("DADOS INVÁLIDOS");
  });
});
