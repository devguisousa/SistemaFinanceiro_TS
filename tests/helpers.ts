import bcrypt from "bcrypt";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/prisma.js";

let accessToken = "";

// Hash pronto para não pagar o custo do bcrypt em cada teste
const SENHA_PADRAO = "senha-teste-123";
const HASH_PADRAO = bcrypt.hashSync(SENHA_PADRAO, 4);

/** Cria um usuário direto no banco e devolve os tokens do login. */
export async function criarUsuarioLogado(
  email: string,
  papel: "ADMIN" | "USUARIO" = "USUARIO",
) {
  const usuario = await prisma.usuario.create({
    data: { email, senha: HASH_PADRAO, papel },
  });

  const login = await request(app)
    .post("/auth/login")
    .send({ email, senha: SENHA_PADRAO });

  return {
    id: usuario.id,
    accessToken: login.body.accessToken as string,
    refreshToken: login.body.refreshToken as string,
  };
}

export const senhaPadrao = SENHA_PADRAO;

// Usuário padrão dos testes: ADMIN (pode tudo)
export async function prepararUsuarioLogado() {
  accessToken = (await criarUsuarioLogado("admin@teste.com", "ADMIN"))
    .accessToken;
}

function comToken(token: () => string) {
  return () => {
    const r = request(app);
    const auth = (t: request.Test) =>
      t.set("Authorization", `Bearer ${token()}`);

    return {
      get: (url: string) => auth(r.get(url)),
      post: (url: string) => auth(r.post(url)),
      put: (url: string) => auth(r.put(url)),
      patch: (url: string) => auth(r.patch(url)),
      delete: (url: string) => auth(r.delete(url)),
    };
  };
}

// Requisições autenticadas como ADMIN
export const api = comToken(() => accessToken);

// Requisições autenticadas com um token qualquer
export const apiCom = (token: string) => comToken(() => token)();

// Requisições sem token (rotas públicas e testes de 401)
export const apiSemToken = () => request(app);

export async function criarConta(
  nome = "Banco Teste",
  saldoInicial = "1000.00",
) {
  const res = await api().post("/contas").send({ nome, saldoInicial });
  return res.body as { id: number };
}

export async function criarCategoria(
  nome = "Geral",
  tipo: "RECEITA" | "DESPESA" = "RECEITA",
) {
  const res = await api().post("/categoria").send({ nome, tipo });
  return res.body as { id: number };
}
