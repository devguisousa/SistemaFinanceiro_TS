import { beforeEach, describe, expect, it } from "vitest";
import {
  api,
  apiCom,
  apiSemToken,
  criarCategoria,
  criarConta,
  criarUsuarioLogado,
} from "./helpers.js";

const vencimento = "2026-12-10";

describe("Dados separados por usuário", () => {
  let outro: ReturnType<typeof apiCom>;
  let contaId: number;
  let categoriaId: number;
  let transacaoId: number;
  let contaPagarId: number;
  let contaReceberId: number;

  beforeEach(async () => {
    outro = apiCom((await criarUsuarioLogado("outro@x.com")).accessToken);

    // Tudo isso é do ADMIN (dono dos dados)
    contaId = (await criarConta()).id;
    categoriaId = (await criarCategoria("Mercado", "DESPESA")).id;
    transacaoId = (
      await api().post("/transacao").send({
        descricao: "Café",
        valor: "5",
        tipo: "DESPESA",
        contaId,
        categoriaId,
      })
    ).body.id;
    contaPagarId = (
      await api()
        .post("/contaPagar")
        .send({ descricao: "Luz", valorTotal: "50", vencimento })
    ).body.id;
    contaReceberId = (
      await api()
        .post("/contaReceber")
        .send({ descricao: "Job", valorTotal: "50", vencimento })
    ).body.id;
  });

  it("listas do outro usuário vêm vazias", async () => {
    const rotas = [
      ["/contas", "contas"],
      ["/categoria", "categoria"],
      ["/transacao", "transacao"],
      ["/transferencias", "transferencias"],
      ["/contaPagar", "contaPagar"],
      ["/contaReceber", "contaReceber"],
      ["/pagamentoPagar", "pagamento"],
      ["/recebimentos", "recebimentos"],
    ] as const;

    for (const [rota, chave] of rotas) {
      const res = await outro.get(rota);
      expect(res.status, rota).toBe(200);
      expect(res.body[chave], rota).toEqual([]);
    }
  });

  it("registro de outro usuário dá 404 em leitura, edição e exclusão", async () => {
    const tentativas = [
      outro.get(`/contas/${contaId}`),
      outro.get(`/contas/${contaId}/saldo`),
      outro.put(`/contas/${contaId}`).send({ nome: "X", saldoAtual: "0" }),
      outro.delete(`/contas/${contaId}`),
      outro.get(`/categoria/${categoriaId}`),
      outro
        .put(`/categoria/${categoriaId}`)
        .send({ nome: "X", tipo: "DESPESA" }),
      outro.delete(`/categoria/${categoriaId}`),
      outro.get(`/transacao/${transacaoId}`),
      outro.delete(`/transacao/${transacaoId}`),
      outro.get(`/contaPagar/${contaPagarId}`),
      outro.delete(`/contaPagar/${contaPagarId}`),
      outro.get(`/contaReceber/${contaReceberId}`),
      outro.delete(`/contaReceber/${contaReceberId}`),
    ];

    for (const [i, res] of (await Promise.all(tentativas)).entries()) {
      expect(res.status, `tentativa ${i}`).toBe(404);
    }
  });

  it("não deixa usar conta ou categoria de outro usuário", async () => {
    const transacao = await outro.post("/transacao").send({
      descricao: "Roubo",
      valor: "1",
      tipo: "DESPESA",
      contaId,
      categoriaId,
    });
    expect(transacao.status).toBe(404);

    const minhaConta = (
      await outro.post("/contas").send({ nome: "Minha", saldoInicial: "100" })
    ).body.id;

    const transferencia = await outro.post("/transferencias").send({
      contaOrigemId: minhaConta,
      contaDestinoId: contaId,
      valor: "10",
    });
    expect(transferencia.status).toBe(404);

    const pagamento = await outro
      .post(`/pagamentoPagar/contaPagar/${contaPagarId}`)
      .send({ contaId: minhaConta, categoriaId, valor: "10" });
    expect(pagamento.status).toBe(404);
  });

  it("USUARIO faz tudo nos próprios dados e o mesmo nome de categoria vale para cada um", async () => {
    const conta = await outro
      .post("/contas")
      .send({ nome: "Minha", saldoInicial: "100" });
    expect(conta.status).toBe(201);

    // "Mercado" já existe para o ADMIN, mas é livre para este usuário
    const categoria = await outro
      .post("/categoria")
      .send({ nome: "Mercado", tipo: "DESPESA" });
    expect(categoria.status).toBe(201);

    const transacao = await outro.post("/transacao").send({
      descricao: "Pão",
      valor: "5",
      tipo: "DESPESA",
      contaId: conta.body.id,
      categoriaId: categoria.body.id,
    });
    expect(transacao.status).toBe(201);

    expect((await outro.delete(`/transacao/${transacao.body.id}`)).status).toBe(
      204,
    );
    expect((await outro.delete(`/contas/${conta.body.id}`)).status).toBe(204);

    // O ADMIN continua vendo só o que é dele
    expect((await api().get("/contas")).body.total).toBe(1);
  });

  it("transferência cria categorias do sistema por usuário", async () => {
    const a = (
      await outro.post("/contas").send({ nome: "A", saldoInicial: "100" })
    ).body.id;
    const b = (
      await outro.post("/contas").send({ nome: "B", saldoInicial: "0" })
    ).body.id;

    const res = await outro
      .post("/transferencias")
      .send({ contaOrigemId: a, contaDestinoId: b, valor: "10" });
    expect(res.status).toBe(201);

    expect((await outro.get("/categoria")).body.total).toBe(2);
    expect((await api().get("/categoria")).body.total).toBe(1);
  });

  it("apagar o usuário apaga os dados dele", async () => {
    const { id, accessToken } = await criarUsuarioLogado("sair@x.com");
    const dele = apiCom(accessToken);
    const a = (await dele.post("/contas").send({ nome: "A", saldoInicial: "100" }))
      .body.id;
    const b = (await dele.post("/contas").send({ nome: "B", saldoInicial: "0" }))
      .body.id;
    await dele
      .post("/transferencias")
      .send({ contaOrigemId: a, contaDestinoId: b, valor: "10" });

    expect((await api().delete(`/usuarios/${id}`)).status).toBe(204);
    expect((await dele.get("/contas")).status).toBe(401);
    // Os dados do ADMIN ficam intactos
    expect((await api().get("/contas")).body.total).toBe(1);
  });
});

describe("Cadastro aberto", () => {
  it("cria um USUARIO e já devolve os tokens", async () => {
    const res = await apiSemToken()
      .post("/auth/cadastro")
      .send({ email: "Novo@X.com", senha: "12345678" });
    expect(res.status).toBe(201);

    const eu = await apiCom(res.body.accessToken).get("/auth/me");
    expect(eu.body.email).toBe("novo@x.com");
    expect(eu.body.papel).toBe("USUARIO");
  });

  it("ignora papel enviado, recusa e-mail repetido e dados inválidos", async () => {
    const criado = await apiSemToken()
      .post("/auth/cadastro")
      .send({ email: "a@x.com", senha: "12345678", papel: "ADMIN" });
    expect(criado.status).toBe(201);
    expect(
      (await apiCom(criado.body.accessToken).get("/auth/me")).body.papel,
    ).toBe("USUARIO");

    const repetido = await apiSemToken()
      .post("/auth/cadastro")
      .send({ email: "a@x.com", senha: "12345678" });
    expect(repetido.status).toBe(409);

    const curta = await apiSemToken()
      .post("/auth/cadastro")
      .send({ email: "b@x.com", senha: "123" });
    expect(curta.status).toBe(400);
  });

  it("USUARIO continua sem acesso à gestão de usuários", async () => {
    const { accessToken } = await criarUsuarioLogado("comum@x.com");
    const comum = apiCom(accessToken);

    for (const res of await Promise.all([
      comum.get("/usuarios"),
      comum.post("/auth/registrar").send({ email: "n@n.com", senha: "12345678" }),
    ])) {
      expect(res.status).toBe(403);
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
