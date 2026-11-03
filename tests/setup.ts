import { config } from "dotenv";
import { afterAll, beforeEach } from "vitest";

config({ path: ".env.test", override: true, quiet: true });

// Trava de segurança: nunca limpar um banco que não seja de teste
if (!process.env.DATABASE_URL?.includes("_test")) {
  throw new Error(
    "DATABASE_URL de teste inválida: o nome do banco deve conter '_test'",
  );
}

const { prisma } = await import("../src/prisma.js");
const { prepararUsuarioLogado } = await import("./helpers.js");

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "RefreshToken",
      "Transferencia",
      "Usuario",
      "RecebimentoContaReceber",
      "PagamentoContaPagar",
      "Transacao",
      "ContaReceber",
      "ContaPagar",
      "Categoria",
      "Conta"
    RESTART IDENTITY CASCADE
  `);

  await prepararUsuarioLogado();
});

afterAll(async () => {
  await prisma.$disconnect();
});
