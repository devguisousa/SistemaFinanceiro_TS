import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { apiSemToken as api } from "./helpers.js";

const credenciais = { email: "maria@email.com", senha: "segredo123" };

async function registrarELogar() {
  await api().post("/auth/registrar").send(credenciais);
  const login = await api().post("/auth/login").send(credenciais);
  return login.body as { accessToken: string; refreshToken: string };
}

describe("Autenticação", () => {
  describe("registrar", () => {
    it("cadastra sem devolver a senha", async () => {
      const res = await api().post("/auth/registrar").send(credenciais);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(Number),
        email: credenciais.email,
      });
    });

    it("normaliza o e-mail e impede duplicado", async () => {
      await api().post("/auth/registrar").send(credenciais);

      const res = await api()
        .post("/auth/registrar")
        .send({ ...credenciais, email: "  MARIA@Email.com " });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ erro: "USUÁRIO JÁ EXISTE" });
    });

    it("valida e-mail e tamanho da senha", async () => {
      const email = await api()
        .post("/auth/registrar")
        .send({ email: "x", senha: "123456" });
      const senha = await api()
        .post("/auth/registrar")
        .send({ email: "a@a.com", senha: "123" });

      expect(email.status).toBe(400);
      expect(senha.status).toBe(400);
      expect(senha.body.erro).toBe("DADOS INVÁLIDOS");
    });
  });

  describe("login", () => {
    it("devolve accessToken e refreshToken", async () => {
      await api().post("/auth/registrar").send(credenciais);

      const res = await api()
        .post("/auth/login")
        .send({ ...credenciais, email: "Maria@Email.com" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });

    it("recusa senha errada e usuário inexistente com a mesma mensagem", async () => {
      await api().post("/auth/registrar").send(credenciais);

      const senhaErrada = await api()
        .post("/auth/login")
        .send({ ...credenciais, senha: "errada" });
      const naoExiste = await api()
        .post("/auth/login")
        .send({ email: "nao@existe.com", senha: "x" });

      expect(senhaErrada.status).toBe(401);
      expect(naoExiste.status).toBe(401);
      expect(senhaErrada.body).toEqual(naoExiste.body);
    });
  });

  describe("rotas protegidas", () => {
    it("sem token responde 401", async () => {
      const res = await api().get("/contas");

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ erro: "TOKEN NÃO ENVIADO" });
    });

    it("com token válido acessa", async () => {
      const { accessToken } = await registrarELogar();

      const res = await api()
        .get("/contas")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
    });

    it("recusa token inválido, sem sub, com outro segredo ou expirado", async () => {
      const segredo = process.env.JWT_SEGREDO!;
      const tokens = [
        "abc.def.ghi",
        jwt.sign({}, segredo),
        jwt.sign({ sub: "1" }, "outro-segredo"),
        jwt.sign({ sub: "1" }, segredo, { expiresIn: -10 }),
      ];

      for (const token of tokens) {
        const res = await api()
          .get("/contas")
          .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ erro: "TOKEN INVÁLIDO OU EXPIRADO" });
      }
    });
  });

  describe("refresh", () => {
    it("troca por um par novo", async () => {
      const { refreshToken } = await registrarELogar();

      const res = await api().post("/auth/refresh").send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.refreshToken).not.toBe(refreshToken);
      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    it("reuso de token revoga todos os tokens do usuário", async () => {
      const { refreshToken: antigo } = await registrarELogar();

      const novo = (
        await api().post("/auth/refresh").send({ refreshToken: antigo })
      ).body.refreshToken;

      const reuso = await api()
        .post("/auth/refresh")
        .send({ refreshToken: antigo });
      expect(reuso.status).toBe(401);
      expect(reuso.body).toEqual({ erro: "REFRESH TOKEN REUTILIZADO" });

      // O token novo também foi revogado
      const depois = await api()
        .post("/auth/refresh")
        .send({ refreshToken: novo });
      expect(depois.status).toBe(401);
    });

    it("duas trocas simultâneas: só uma funciona", async () => {
      const { refreshToken } = await registrarELogar();

      const respostas = await Promise.all([
        api().post("/auth/refresh").send({ refreshToken }),
        api().post("/auth/refresh").send({ refreshToken }),
      ]);

      const sucesso = respostas.filter((r) => r.status === 200);
      expect(sucesso).toHaveLength(1);
      expect(respostas.every((r) => r.status === 200 || r.status === 401)).toBe(
        true,
      );
    });

    it("recusa token desconhecido e body vazio", async () => {
      const desconhecido = await api()
        .post("/auth/refresh")
        .send({ refreshToken: "nao-existe" });
      expect(desconhecido.status).toBe(401);
      expect(desconhecido.body).toEqual({
        erro: "REFRESH TOKEN INVÁLIDO OU EXPIRADO",
      });

      expect((await api().post("/auth/refresh").send({})).status).toBe(400);
    });
  });

  describe("logout", () => {
    it("invalida o refresh token", async () => {
      const { refreshToken } = await registrarELogar();

      expect(
        (await api().post("/auth/logout").send({ refreshToken })).status,
      ).toBe(204);
      expect(
        (await api().post("/auth/refresh").send({ refreshToken })).status,
      ).toBe(401);
    });

    it("sem body responde 400 (antes dava 500)", async () => {
      const res = await api().post("/auth/logout");

      expect(res.status).toBe(400);
      expect(res.body.erro).toBe("DADOS INVÁLIDOS");
    });
  });
});
