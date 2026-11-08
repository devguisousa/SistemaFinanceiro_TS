import { beforeEach, describe, expect, it } from "vitest";
import {
  api,
  criarCategoria,
  criarConta,
  criarUsuarioLogado,
  apiCom,
} from "./helpers.js";

let contaId: number;
let despesaId: number;
let receitaId: number;

const saldo = async () =>
  (await api().get(`/contas/${contaId}/saldo`)).body.saldoAtual as string;

beforeEach(async () => {
  contaId = (await criarConta("Banco", "1000.00")).id;
  despesaId = (await criarCategoria("Contas", "DESPESA")).id;
  receitaId = (await criarCategoria("Freela", "RECEITA")).id;
});

describe("Apagar pagamento", () => {
  async function contaPagarComPagamentos(...valores: string[]) {
    const cp = (
      await api().post("/contaPagar").send({
        descricao: "Aluguel",
        valorTotal: "500",
        vencimento: "2026-12-10",
      })
    ).body.id as number;

    const ids: number[] = [];
    for (const valor of valores) {
      const res = await api()
        .post(`/pagamentoPagar/contaPagar/${cp}`)
        .send({ contaId, categoriaId: despesaId, valor });
      ids.push(res.body.pagamento.id);
    }

    return { cp, ids };
  }

  it("devolve o valor para a conta e reabre a conta a pagar", async () => {
    const { cp, ids } = await contaPagarComPagamentos("300", "200");
    expect(await saldo()).toBe("500.00");
    expect((await api().get(`/contaPagar/${cp}`)).body.status).toBe("PAGA");

    expect((await api().delete(`/pagamentoPagar/${ids[1]}`)).status).toBe(204);

    const parcial = (await api().get(`/contaPagar/${cp}`)).body;
    expect(parcial).toMatchObject({
      valorPago: "300.00",
      status: "PARCIALMENTE_PAGA",
    });
    expect(await saldo()).toBe("700.00");

    expect((await api().delete(`/pagamentoPagar/${ids[0]}`)).status).toBe(204);

    const pendente = (await api().get(`/contaPagar/${cp}`)).body;
    expect(pendente).toMatchObject({ valorPago: "0.00", status: "PENDENTE" });
    expect(await saldo()).toBe("1000.00");

    // Sem pagamentos, a conta a pagar já pode ser apagada
    expect((await api().delete(`/contaPagar/${cp}`)).status).toBe(204);
  });

  it("apaga a transação gerada pelo pagamento", async () => {
    const { ids } = await contaPagarComPagamentos("100");

    await api().delete(`/pagamentoPagar/${ids[0]}`);

    expect((await api().get("/transacao")).body.total).toBe(0);
    expect((await api().get(`/pagamentoPagar/${ids[0]}`)).status).toBe(404);
  });

  it("pagamento de antes do saldo digitado não mexe no saldo", async () => {
    const { ids } = await contaPagarComPagamentos("100");
    await api().put(`/contas/${contaId}`).send({ nome: "Banco", saldoAtual: "950" });

    await api().delete(`/pagamentoPagar/${ids[0]}`);

    expect(await saldo()).toBe("950.00");
  });

  it("responde 404 para pagamento inexistente ou de outro usuário e 400 para id inválido", async () => {
    const { ids } = await contaPagarComPagamentos("100");
    const outro = apiCom((await criarUsuarioLogado("outro@teste.com")).accessToken);

    expect((await outro.delete(`/pagamentoPagar/${ids[0]}`)).status).toBe(404);
    expect((await api().delete("/pagamentoPagar/999")).body).toEqual({
      erro: "PAGAMENTO NÃO ENCONTRADO",
    });
    expect((await api().delete("/pagamentoPagar/abc")).status).toBe(400);
    expect(await saldo()).toBe("900.00");
  });
});

describe("Apagar recebimento", () => {
  async function contaReceberComRecebimento(valor: string) {
    const cr = (
      await api().post("/contaReceber").send({
        descricao: "Projeto",
        valorTotal: "400",
        vencimento: "2026-12-20",
      })
    ).body.id as number;

    const res = await api()
      .post(`/contaReceber/${cr}/recebimentos`)
      .send({ contaId, categoriaId: receitaId, valor });

    return { cr, id: res.body.recebimento.id as number };
  }

  it("tira o valor da conta e reabre a conta a receber", async () => {
    const { cr, id } = await contaReceberComRecebimento("400");
    expect(await saldo()).toBe("1400.00");

    expect((await api().delete(`/recebimentos/${id}`)).status).toBe(204);

    const conta = (await api().get(`/contaReceber/${cr}`)).body;
    expect(conta).toMatchObject({ valorRecebido: "0.00", status: "PENDENTE" });
    expect(await saldo()).toBe("1000.00");
    expect((await api().get("/transacao")).body.total).toBe(0);
  });

  it("bloqueia quando o dinheiro já foi gasto (saldo ficaria negativo)", async () => {
    const { cr, id } = await contaReceberComRecebimento("400");
    await api().post("/transacao").send({
      descricao: "Gasto",
      valor: "1200",
      tipo: "DESPESA",
      contaId,
      categoriaId: despesaId,
    });

    const res = await api().delete(`/recebimentos/${id}`);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ erro: "SALDO INSUFICIENTE" });

    // Nada mudou
    expect((await api().get(`/contaReceber/${cr}`)).body.status).toBe("RECEBIDA");
    expect(await saldo()).toBe("200.00");
  });

  it("responde 404 para recebimento inexistente ou de outro usuário", async () => {
    const { id } = await contaReceberComRecebimento("100");
    const outro = apiCom((await criarUsuarioLogado("outro@teste.com")).accessToken);

    expect((await outro.delete(`/recebimentos/${id}`)).status).toBe(404);
    expect((await api().delete("/recebimentos/999")).body).toEqual({
      erro: "RECEBIMENTO NÃO ENCONTRADO",
    });
  });
});
