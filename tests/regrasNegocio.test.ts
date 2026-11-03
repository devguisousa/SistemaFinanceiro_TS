import { beforeEach, describe, expect, it } from "vitest";
import { api, criarCategoria, criarConta } from "./helpers.js";

let contaId: number;
let despesaId: number;
let receitaId: number;

const vencimento = "2026-12-10";

describe("Regras de negócio", () => {
  beforeEach(async () => {
    contaId = (await criarConta()).id;
    despesaId = (await criarCategoria("Contas", "DESPESA")).id;
    receitaId = (await criarCategoria("Serviços", "RECEITA")).id;
  });

  describe("edição de conta a pagar", () => {
    async function contaComPagamento(total: string, pago: string) {
      const id = (
        await api()
          .post("/contaPagar")
          .send({ descricao: "Luz", valorTotal: total, vencimento })
      ).body.id;
      await api()
        .post(`/pagamentoPagar/contaPagar/${id}`)
        .send({ contaId, categoriaId: despesaId, valor: pago });
      return id;
    }

    const editar = (id: number, valorTotal: string) =>
      api()
        .put(`/contaPagar/${id}`)
        .send({ descricao: "Luz", valorTotal, vencimento });

    it("bloqueia valorTotal menor que o já pago (409)", async () => {
      const id = await contaComPagamento("100.00", "60.00");

      const res = await editar(id, "59.99");

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ erro: "VALOR TOTAL MENOR QUE O JÁ PAGO" });
    });

    it("recalcula o status", async () => {
      const id = await contaComPagamento("100.00", "60.00");

      expect((await editar(id, "60.00")).body.status).toBe("PAGA");
      expect((await editar(id, "80.00")).body.status).toBe("PARCIALMENTE_PAGA");
    });

    it("conta sem pagamento continua PENDENTE", async () => {
      const id = (
        await api()
          .post("/contaPagar")
          .send({ descricao: "Água", valorTotal: "50", vencimento })
      ).body.id;

      expect((await editar(id, "70.00")).body.status).toBe("PENDENTE");
      expect((await editar(999, "70.00")).status).toBe(404);
    });
  });

  describe("edição de conta a receber", () => {
    async function contaComRecebimento(total: string, recebido: string) {
      const id = (
        await api()
          .post("/contaReceber")
          .send({ descricao: "Job", valorTotal: total, vencimento })
      ).body.id;
      await api()
        .post(`/contaReceber/${id}/recebimentos`)
        .send({ contaId, categoriaId: receitaId, valor: recebido });
      return id;
    }

    const editar = (id: number, valorTotal: string) =>
      api()
        .put(`/contaReceber/${id}`)
        .send({ descricao: "Job", valorTotal, vencimento });

    it("bloqueia valorTotal menor que o já recebido (409)", async () => {
      const id = await contaComRecebimento("100.00", "40.00");

      const res = await editar(id, "39.00");

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ erro: "VALOR TOTAL MENOR QUE O JÁ RECEBIDO" });
    });

    it("recalcula o status", async () => {
      const id = await contaComRecebimento("100.00", "40.00");

      expect((await editar(id, "40.00")).body.status).toBe("RECEBIDA");
      expect((await editar(id, "90.00")).body.status).toBe(
        "PARCIALMENTE_RECEBIDA",
      );
      expect((await editar(999, "90.00")).status).toBe(404);
    });
  });

  describe("transações vinculadas", () => {
    it("não permite editar nem apagar transação de pagamento", async () => {
      const contaPagarId = (
        await api()
          .post("/contaPagar")
          .send({ descricao: "Net", valorTotal: "100", vencimento })
      ).body.id;
      const pagamento = await api()
        .post(`/pagamentoPagar/contaPagar/${contaPagarId}`)
        .send({ contaId, categoriaId: despesaId, valor: "100" });

      const transacaoId = pagamento.body.transacao.id;

      const editar = await api().put(`/transacao/${transacaoId}`).send({
        descricao: "x",
        valor: "1",
        tipo: "DESPESA",
        contaId,
        categoriaId: despesaId,
      });
      expect(editar.status).toBe(409);
      expect(editar.body).toEqual({
        erro: "TRANSAÇÃO VINCULADA A PAGAMENTO, RECEBIMENTO OU TRANSFERÊNCIA",
      });

      const apagar = await api().delete(`/transacao/${transacaoId}`);
      expect(apagar.status).toBe(409);
    });

    it("não permite apagar transação de recebimento", async () => {
      const contaReceberId = (
        await api()
          .post("/contaReceber")
          .send({ descricao: "Job", valorTotal: "100", vencimento })
      ).body.id;
      const recebimento = await api()
        .post(`/contaReceber/${contaReceberId}/recebimentos`)
        .send({ contaId, categoriaId: receitaId, valor: "100" });

      const apagar = await api().delete(
        `/transacao/${recebimento.body.transacao.id}`,
      );
      expect(apagar.status).toBe(409);
    });

    it("transação avulsa continua editável", async () => {
      const t = await api().post("/transacao").send({
        descricao: "Avulsa",
        valor: "5",
        tipo: "RECEITA",
        contaId,
        categoriaId: receitaId,
      });

      expect((await api().delete(`/transacao/${t.body.id}`)).status).toBe(204);
    });
  });
});
