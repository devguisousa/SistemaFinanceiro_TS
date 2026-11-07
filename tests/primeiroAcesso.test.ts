import { describe, expect, it } from "vitest";
import { prisma } from "../src/prisma.js";
import { apiCom, apiSemToken, criarUsuarioLogado } from "./helpers.js";

// O setup cria "admin@teste.com" (ADMIN) antes de cada teste.
// Os testes "sem admin" apagam todos os usuários primeiro.
const semUsuarios = () => prisma.usuario.deleteMany();

describe("Primeiro acesso", () => {
  it("status: true sem ADMIN (mesmo com USUARIO), false com ADMIN", async () => {
    expect((await apiSemToken().get("/auth/status")).body).toEqual({
      precisaAdmin: false,
    });

    await semUsuarios();
    await criarUsuarioLogado("comum@x.com", "USUARIO");

    const res = await apiSemToken().get("/auth/status");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ precisaAdmin: true });
  });

  it("cria o ADMIN sem token e devolve tokens que funcionam", async () => {
    await semUsuarios();

    const res = await apiSemToken()
      .post("/auth/primeiro-admin")
      .send({ email: "  Dono@Email.com ", senha: "segredo123" });

    expect(res.status).toBe(201);

    const me = await apiCom(res.body.accessToken).get("/auth/me");
    expect(me.body).toMatchObject({ email: "dono@email.com", papel: "ADMIN" });

    const refresh = await apiSemToken()
      .post("/auth/refresh")
      .send({ refreshToken: res.body.refreshToken });
    expect(refresh.status).toBe(200);
  });

  it("409 JÁ EXISTE UM ADMINISTRADOR quando já há ADMIN", async () => {
    const res = await apiSemToken()
      .post("/auth/primeiro-admin")
      .send({ email: "outro@x.com", senha: "segredo123" });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ erro: "JÁ EXISTE UM ADMINISTRADOR" });
  });

  it("409 USUÁRIO JÁ EXISTE quando o e-mail é de um USUARIO", async () => {
    await semUsuarios();
    await criarUsuarioLogado("comum@x.com", "USUARIO");

    const res = await apiSemToken()
      .post("/auth/primeiro-admin")
      .send({ email: "comum@x.com", senha: "segredo123" });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ erro: "USUÁRIO JÁ EXISTE" });
  });

  it("400 com senha curta, com detalhes", async () => {
    await semUsuarios();

    const res = await apiSemToken()
      .post("/auth/primeiro-admin")
      .send({ email: "dono@x.com", senha: "1234" });

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe("DADOS INVÁLIDOS");
    expect(res.body.detalhes[0].path).toEqual(["senha"]);
  });

  it("ignora papel no corpo e cria ADMIN", async () => {
    await semUsuarios();

    const res = await apiSemToken()
      .post("/auth/primeiro-admin")
      .send({ email: "dono@x.com", senha: "segredo123", papel: "USUARIO" });

    const me = await apiCom(res.body.accessToken).get("/auth/me");
    expect(me.body.papel).toBe("ADMIN");
  });

  it("dois pedidos ao mesmo tempo criam só um ADMIN", async () => {
    await semUsuarios();

    const [a, b] = await Promise.all([
      apiSemToken()
        .post("/auth/primeiro-admin")
        .send({ email: "a@x.com", senha: "segredo123" }),
      apiSemToken()
        .post("/auth/primeiro-admin")
        .send({ email: "b@x.com", senha: "segredo123" }),
    ]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await prisma.usuario.count({ where: { papel: "ADMIN" } })).toBe(1);
  });
});
