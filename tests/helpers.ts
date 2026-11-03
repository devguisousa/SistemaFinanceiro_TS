import request from "supertest";
import { app } from "../src/app.js";

let accessToken = "";

// Cria um usuário e guarda o token usado pelas requisições de api()
export async function prepararUsuarioLogado() {
  const credenciais = { email: "teste@teste.com", senha: "123456" };

  await request(app).post("/auth/registrar").send(credenciais);
  const login = await request(app).post("/auth/login").send(credenciais);

  accessToken = login.body.accessToken;
}

// Requisições autenticadas
export function api() {
  const r = request(app);
  const comToken = (t: request.Test) =>
    t.set("Authorization", `Bearer ${accessToken}`);

  return {
    get: (url: string) => comToken(r.get(url)),
    post: (url: string) => comToken(r.post(url)),
    put: (url: string) => comToken(r.put(url)),
    delete: (url: string) => comToken(r.delete(url)),
  };
}

// Requisições sem token (rotas públicas e testes de 401)
export const apiSemToken = () => request(app);

export async function criarConta(
  nome = "Banco Teste",
  saldoInicial = "1000.00",
) {
  const res = await api().post("/contas").send({ nome, saldoInicial });
  return res.body as { id: number };
}

export async function criarCategoria(nome = "Geral") {
  const res = await api().post("/categoria").send({ nome });
  return res.body as { id: number };
}
