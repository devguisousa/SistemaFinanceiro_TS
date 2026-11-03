import { beforeEach, describe, expect, it } from "vitest";
import {
  api,
  apiCom,
  criarCategoria,
  criarConta,
  criarUsuarioLogado,
} from "./helpers.js";

let usuario: ReturnType<typeof apiCom>;
let contaId: number;
let receitaId: number;
let despesaId: number;

const vencimento = "2026-12-10";

describe("Permissões do papel USUARIO", () => {
  beforeEach(async () => {
    usuario = apiCom((await criarUsuarioLogado("comum@x.com")).accessToken);
    contaId = (await criarConta()).id;
    receitaId = (await criarCategoria("Salário", "RECEITA")).id;
    despesaId = (await criarCategoria("Mercado", "DESPESA")).id;
  });

  it("pode ler tudo", async () => {
    const rotas = [
      "/contas",
      `/contas/${contaId}`,
      `/contas/${contaId}/saldo`,
      "/categoria",
      "/transacao",
      "/transferencias",
      "/contaPagar",
      "/pagamentoPagar",
      "/contaReceber",
      "/recebimentos",
      "/auth/me",
    ];

    for (const rota of rotas) {
      expect((await usuario.get(rota)).status, rota).toBe(200);
    }
  });

  it("pode fazer lançamentos", async () => {
    const transacao = await usuario.post("/transacao").send({
      descricao: "Café",
      valor: "5",
      tipo: "DESPESA",
      contaId,
      categoriaId: despesaId,
    });
    expect(transacao.status).toBe(201);

    const destino = (await criarConta("Destino", "0")).id;
    const transferencia = await usuario.post("/transferencias").send({
      contaOrigemId: contaId,
      contaDestinoId: destino,
      valor: "10",
    });
    expect(transferencia.status).toBe(201);

    const contaPagar = (
      await api()
        .post("/contaPagar")
        .send({ descricao: "Luz", valorTotal: "50", vencimento })
    ).body.id;
    const pagamento = await usuario
      .post(`/pagamentoPagar/contaPagar/${contaPagar}`)
      .send({
        contaId,
        categoriaId: despesaId,
        valor: "50",
      });
    expect(pagamento.status).toBe(201);

    const contaReceber = (
      await api()
        .post("/contaReceber")
        .send({ descricao: "Job", valorTotal: "50", vencimento })
    ).body.id;
    const recebimento = await usuario
      .post(`/contaReceber/${contaReceber}/recebimentos`)
      .send({
        contaId,
        categoriaId: receitaId,
        valor: "50",
      });
    expect(recebimento.status).toBe(201);
  });

  it("não pode criar, editar ou apagar cadastros (403)", async () => {
    const transacaoId = (
      await api().post("/transacao").send({
        descricao: "x",
        valor: "1",
        tipo: "RECEITA",
        contaId,
        categoriaId: receitaId,
      })
    ).body.id;

    const tentativas = [
      usuario.post("/contas").send({ nome: "X" }),
      usuario.put(`/contas/${contaId}`).send({ nome: "X", saldoInicial: "0" }),
      usuario.delete(`/contas/${contaId}`),
      usuario.post("/categoria").send({ nome: "X", tipo: "RECEITA" }),
      usuario
        .put(`/categoria/${receitaId}`)
        .send({ nome: "X", tipo: "RECEITA" }),
      usuario.delete(`/categoria/${receitaId}`),
      usuario
        .post("/contaPagar")
        .send({ descricao: "x", valorTotal: "1", vencimento }),
      usuario
        .post("/contaReceber")
        .send({ descricao: "x", valorTotal: "1", vencimento }),
      usuario
        .put(`/transacao/${transacaoId}`)
        .send({
          descricao: "x",
          valor: "2",
          tipo: "RECEITA",
          contaId,
          categoriaId: receitaId,
        }),
      usuario.delete(`/transacao/${transacaoId}`),
      usuario.delete("/transferencias/1"),
      usuario.get("/usuarios"),
      usuario
        .post("/auth/registrar")
        .send({ email: "n@n.com", senha: "12345678" }),
    ];

    for (const [i, res] of (await Promise.all(tentativas)).entries()) {
      expect(res.status, `tentativa ${i}`).toBe(403);
      expect(res.body).toEqual({ erro: "ACESSO NEGADO" });
    }
  });
});

describe("Gestão de usuários (ADMIN)", () => {
  it("lista, busca e muda o papel", async () => {
    const { id, accessToken } = await criarUsuarioLogado("promovido@x.com");

    const lista = await api().get("/usuarios");
    expect(lista.status).toBe(200);
    expect(lista.body.total).toBe(2);
    expect(lista.body.usuarios[0]).not.toHaveProperty("senha");

    expect((await api().get(`/usuarios/${id}`)).body.email).toBe(
      "promovido@x.com",
    );

    // Antes da promoção, bloqueado; depois, liberado com o mesmo token
    expect((await apiCom(accessToken).get("/usuarios")).status).toBe(403);
    const promovido = await api()
      .patch(`/usuarios/${id}/papel`)
      .send({ papel: "ADMIN" });
    expect(promovido.body.papel).toBe("ADMIN");
    expect((await apiCom(accessToken).get("/usuarios")).status).toBe(200);
  });

  it("não deixa o sistema sem ADMIN", async () => {
    const admin = (await api().get("/usuarios")).body.usuarios[0].id;

    const rebaixar = await api()
      .patch(`/usuarios/${admin}/papel`)
      .send({ papel: "USUARIO" });
    expect(rebaixar.status).toBe(409);
    expect(rebaixar.body).toEqual({
      erro: "NÃO É POSSÍVEL REMOVER O ÚLTIMO ADMIN",
    });

    expect((await api().delete(`/usuarios/${admin}`)).status).toBe(409);
  });

  it("404 para usuário inexistente e 400 para papel inválido", async () => {
    expect((await api().get("/usuarios/999")).status).toBe(404);
    expect(
      (await api().patch("/usuarios/1/papel").send({ papel: "DEUS" })).status,
    ).toBe(400);
  });
});
