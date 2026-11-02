import { describe, expect, it } from "vitest";
import { api } from "./helpers.js";

describe("Geral", () => {
  it("rota inexistente responde 404 em JSON", async () => {
    const res = await api().get("/rota-que-nao-existe");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ erro: "ROTA NÃO ENCONTRADA" });
  });

  it("JSON malformado responde 400", async () => {
    const res = await api()
      .post("/contas")
      .set("Content-Type", "application/json")
      .send("{json quebrado");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ erro: "JSON INVÁLIDO" });
  });
});
