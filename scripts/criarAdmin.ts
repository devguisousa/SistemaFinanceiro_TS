/**
 * Cria um ADMIN (ou promove um usuário existente a ADMIN).
 *
 *   npm run criar-admin
 *
 * Pede e-mail e senha no terminal (a senha não aparece enquanto digita).
 * Para automação, aceita ADMIN_EMAIL e ADMIN_SENHA como variáveis de ambiente.
 */
import bcrypt from "bcrypt";
import { createInterface } from "node:readline/promises";
import { cadastroSchema } from "../src/autenticacao/schemas/auth.schema.js";
import { prisma } from "../src/prisma.js";

async function perguntar(texto: string, oculto = false) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  if (oculto) {
    // Esconde o que é digitado (mostra só o texto da pergunta)
    const saida = rl as unknown as { _writeToOutput: (s: string) => void };
    saida._writeToOutput = (s: string) => {
      if (s.includes(texto)) process.stdout.write(texto);
    };
  }

  const resposta = await rl.question(texto);
  rl.close();
  if (oculto) process.stdout.write("\n");

  return resposta;
}

async function main() {
  const email = process.env.ADMIN_EMAIL ?? (await perguntar("E-mail do admin: "));

  const existente = await prisma.usuario.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (existente) {
    await prisma.usuario.update({
      where: { id: existente.id },
      data: { papel: "ADMIN" },
    });

    console.log(`✔ ${existente.email} agora é ADMIN.`);
    return;
  }

  const senha =
    process.env.ADMIN_SENHA ?? (await perguntar("Senha (mín. 8): ", true));

  const dados = cadastroSchema.safeParse({ email, senha, papel: "ADMIN" });

  if (!dados.success) {
    for (const issue of dados.error.issues) {
      console.error(`✖ ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  const usuario = await prisma.usuario.create({
    data: {
      email: dados.data.email,
      senha: await bcrypt.hash(dados.data.senha, 10),
      papel: "ADMIN",
    },
  });

  console.log(`✔ ADMIN criado: ${usuario.email} (id ${usuario.id})`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
