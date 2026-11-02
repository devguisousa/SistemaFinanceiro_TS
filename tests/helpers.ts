import request from "supertest";
import { app } from "../src/app.js";

export const api = () => request(app);

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
