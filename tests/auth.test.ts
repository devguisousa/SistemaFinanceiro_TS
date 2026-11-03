import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import {
  api,
  apiCom,
  apiSemToken,
  criarUsuarioLogado,
  senhaPadrao,
} from "./helpers.js";

describe("Autenticação", () => {
  describe("registrar (somente ADMIN)", () => {
    it("ADMIN cadastra sem devolver a senha", async () => {
      const res = await api()
        .post("/auth/registrar")
        .send({ email: "maria@email.com", senha: "segredo123" });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(Number),
        email: "maria@email.com",
        papel: "USUARIO",
        criadoEm: expect.any(String),
      });
    });

    it("ADMIN pode criar outro ADMIN", async () => {
      const res = await api()
        .post("/auth/registrar")
        .send({
          email: "chefe@email.com",
          senha: "segredo123",
          papel: "ADMIN",
        });

      expect(res.body.papel).toBe("ADMIN");
    });

    it("sem token ou como USUARIO é bloqueado", async () => {
      const dados = { email: "x@x.com", senha: "segredo123" };
      const { accessToken } = await criarUsuarioLogado("comum@x.com");

      expect(
        (await apiSemToken().post("/auth/registrar").send(dados)).status,
      ).toBe(401);
      expect(
        (await apiCom(accessToken).post("/auth/registrar").send(dados)).status,
      ).toBe(403);
    });

    it("normaliza o e-mail e impede duplicado", async () => {
      await api()
        .post("/auth/registrar")
        .send({ email: "maria@email.com", senha: "segredo123" });

      const res = await api()
        .post("/auth/registrar")
        .send({ email: "  MARIA@Email.com ", senha: "segredo123" });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ erro: "USUÁRIO JÁ EXISTE" });
    });

    it("valida e-mail, tamanho e bytes da senha", async () => {
      const casos = [
        { email: "x", senha: "segredo123" },
        { email: "a".repeat(250) + "@x.com", senha: "segredo123" },
        { email: "a@a.com", senha: "1234567" },
        { email: "a@a.com", senha: "😀".repeat(19) }, // 76 bytes
      ];

      for (const caso of casos) {
        const res = await api().post("/auth/registrar").send(caso);
        expect(res.status).toBe(400);
      }
    });
  });

  describe("login", () => {
    it("devolve accessToken e refreshToken (e-mail sem diferenciar maiúsculas)", async () => {
      await criarUsuarioLogado("maria@email.com");

      const res = await apiSemToken()
        .post("/auth/login")
        .send({ email: "Maria@Email.com", senha: senhaPadrao });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });

    it("senha errada e usuário inexistente têm a mesma resposta", async () => {
      await criarUsuarioLogado("maria@email.com");

      const senhaErrada = await apiSemToken()
        .post("/auth/login")
        .send({ email: "maria@email.com", senha: "errada" });
      const naoExiste = await apiSemToken()
        .post("/auth/login")
        .send({ email: "nao@existe.com", senha: "x" });

      expect(senhaErrada.status).toBe(401);
      expect(naoExiste.status).toBe(401);
      expect(senhaErrada.body).toEqual(naoExiste.body);
    });
  });

  describe("rotas protegidas", () => {
    it("sem token responde 401", async () => {
      const res = await apiSemToken().get("/contas");

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ erro: "TOKEN NÃO ENVIADO" });
    });

    it("aceita 'bearer' em minúsculas", async () => {
      const { accessToken } = await criarUsuarioLogado("a@a.com");

      const res = await apiSemToken()
        .get("/contas")
        .set("Authorization", `bearer ${accessToken}`);

      expect(res.status).toBe(200);
    });

    it("recusa token inválido, sem sub/ver, outro segredo, expirado, alg none ou HS512", async () => {
      const segredo = process.env.JWT_SEGREDO!;
      const tokens = [
        "abc.def.ghi",
        jwt.sign({ ver: 0 }, segredo),
        jwt.sign({ sub: "1" }, segredo),
        jwt.sign(
          { sub: "1", ver: 0 },
          "outro-segredo-com-mais-de-32-caracteres",
        ),
        jwt.sign({ sub: "1", ver: 0 }, segredo, { expiresIn: -10 }),
        jwt.sign({ sub: "1", ver: 0 }, segredo, { algorithm: "HS512" }),
        jwt.sign({ sub: "1", ver: 0 }, "", {
          algorithm: "none" as jwt.Algorithm,
        }),
      ];

      for (const token of tokens) {
        const res = await apiSemToken()
          .get("/contas")
          .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ erro: "TOKEN INVÁLIDO OU EXPIRADO" });
      }
    });

    it("token de usuário apagado deixa de valer na hora", async () => {
      const { id, accessToken } = await criarUsuarioLogado("sai@x.com");

      expect((await api().delete(`/usuarios/${id}`)).status).toBe(204);
      expect((await apiCom(accessToken).get("/contas")).status).toBe(401);
    });
  });

  describe("refresh", () => {
    it("troca por um par novo", async () => {
      const { refreshToken } = await criarUsuarioLogado("a@a.com");

      const res = await apiSemToken()
        .post("/auth/refresh")
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.refreshToken).not.toBe(refreshToken);
    });

    it("reuso de token revoga todas as sessões (inclusive o access token)", async () => {
      const { accessToken, refreshToken: antigo } =
        await criarUsuarioLogado("a@a.com");

      const novo = (
        await apiSemToken().post("/auth/refresh").send({ refreshToken: antigo })
      ).body;

      const reuso = await apiSemToken()
        .post("/auth/refresh")
        .send({ refreshToken: antigo });
      expect(reuso.status).toBe(401);
      expect(reuso.body).toEqual({ erro: "REFRESH TOKEN REUTILIZADO" });

      expect(
        (
          await apiSemToken()
            .post("/auth/refresh")
            .send({ refreshToken: novo.refreshToken })
        ).status,
      ).toBe(401);
      expect((await apiCom(accessToken).get("/contas")).status).toBe(401);
      expect((await apiCom(novo.accessToken).get("/contas")).status).toBe(401);
    });

    it("duas trocas simultâneas: só uma funciona", async () => {
      const { refreshToken } = await criarUsuarioLogado("a@a.com");

      const respostas = await Promise.all([
        apiSemToken().post("/auth/refresh").send({ refreshToken }),
        apiSemToken().post("/auth/refresh").send({ refreshToken }),
      ]);

      expect(respostas.filter((r) => r.status === 200)).toHaveLength(1);
      expect(respostas.every((r) => [200, 401].includes(r.status))).toBe(true);
    });

    it("recusa token desconhecido, gigante e body vazio", async () => {
      expect(
        (
          await apiSemToken()
            .post("/auth/refresh")
            .send({ refreshToken: "nao-existe" })
        ).status,
      ).toBe(401);
      expect(
        (
          await apiSemToken()
            .post("/auth/refresh")
            .send({ refreshToken: "a".repeat(500) })
        ).status,
      ).toBe(400);
      expect((await apiSemToken().post("/auth/refresh").send({})).status).toBe(
        400,
      );
    });
  });

  describe("logout", () => {
    it("invalida o refresh token", async () => {
      const { refreshToken } = await criarUsuarioLogado("a@a.com");

      expect(
        (await apiSemToken().post("/auth/logout").send({ refreshToken }))
          .status,
      ).toBe(204);
      expect(
        (await apiSemToken().post("/auth/refresh").send({ refreshToken }))
          .status,
      ).toBe(401);
    });

    it("sem body responde 400", async () => {
      const res = await apiSemToken().post("/auth/logout");

      expect(res.status).toBe(400);
    });
  });

  describe("conta do usuário", () => {
    it("GET /auth/me devolve o perfil sem a senha", async () => {
      const { accessToken } = await criarUsuarioLogado("eu@x.com");

      const res = await apiCom(accessToken).get("/auth/me");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: expect.any(Number),
        email: "eu@x.com",
        papel: "USUARIO",
        criadoEm: expect.any(String),
      });
    });

    it("trocar senha exige a atual e derruba todas as sessões", async () => {
      const { accessToken, refreshToken } =
        await criarUsuarioLogado("eu@x.com");

      const errada = await apiCom(accessToken)
        .put("/auth/senha")
        .send({ senhaAtual: "errada", novaSenha: "novaSenha123" });
      expect(errada.status).toBe(401);
      expect(errada.body).toEqual({ erro: "SENHA ATUAL INCORRETA" });

      const ok = await apiCom(accessToken)
        .put("/auth/senha")
        .send({ senhaAtual: senhaPadrao, novaSenha: "novaSenha123" });
      expect(ok.status).toBe(204);

      expect((await apiCom(accessToken).get("/contas")).status).toBe(401);
      expect(
        (await apiSemToken().post("/auth/refresh").send({ refreshToken }))
          .status,
      ).toBe(401);

      const login = await apiSemToken()
        .post("/auth/login")
        .send({ email: "eu@x.com", senha: "novaSenha123" });
      expect(login.status).toBe(200);
    });

    it("sair de todos invalida access e refresh tokens", async () => {
      const { accessToken, refreshToken } =
        await criarUsuarioLogado("eu@x.com");

      expect(
        (await apiCom(accessToken).post("/auth/sair-de-todos")).status,
      ).toBe(204);

      expect((await apiCom(accessToken).get("/contas")).status).toBe(401);
      expect(
        (await apiSemToken().post("/auth/refresh").send({ refreshToken }))
          .status,
      ).toBe(401);
    });
  });
});
