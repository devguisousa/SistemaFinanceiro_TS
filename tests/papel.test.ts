import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { autenticar } from "../src/autenticacao/middlewares/autenticar.js";
import { exigirPapel } from "../src/autenticacao/middlewares/exigirPapel.js";
import { app } from "../src/app.js";
import { prisma } from "../src/prisma.js";

// App mínimo só para testar o middleware, sem criar rota de admin na API real
const appTeste = express();
appTeste.get("/admin", autenticar, exigirPapel("ADMIN"), (req, res) => {
  res.json({ ok: true });
});

async function usuarioComToken(email: string) {
  const credenciais = { email, senha: "123456" };
  const cadastro = await request(app).post("/auth/registrar").send(credenciais);
  const login = await request(app).post("/auth/login").send(credenciais);

  return {
    id: cadastro.body.id as number,
    token: login.body.accessToken as string,
  };
}

describe("Papel do usuário", () => {
  it("novo usuário nasce com papel USUARIO", async () => {
    const { id } = await usuarioComToken("novo@email.com");

    const usuario = await prisma.usuario.findUnique({ where: { id } });

    expect(usuario?.papel).toBe("USUARIO");
  });

  it("exigirPapel('ADMIN') bloqueia USUARIO com 403", async () => {
    const { token } = await usuarioComToken("comum@email.com");

    const res = await request(appTeste)
      .get("/admin")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ erro: "ACESSO NEGADO" });
  });

  it("exigirPapel('ADMIN') libera ADMIN e vale na hora da troca", async () => {
    const { id, token } = await usuarioComToken("chefe@email.com");

    await prisma.usuario.update({ where: { id }, data: { papel: "ADMIN" } });

    // Mesmo token de antes: o papel é lido do banco
    const res = await request(appTeste)
      .get("/admin")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("sem token continua 401", async () => {
    const res = await request(appTeste).get("/admin");

    expect(res.status).toBe(401);
  });
});
