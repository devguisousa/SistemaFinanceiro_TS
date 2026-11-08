// Cria um ADMIN (ou promove um usuário que já existe a ADMIN).
//
//   npm run criar-admin
//
// Pede e-mail e senha no terminal (a senha não aparece enquanto digita).
// Também aceita ADMIN_EMAIL e ADMIN_SENHA como variáveis de ambiente.
import bcrypt from "bcrypt";
import { createInterface } from "node:readline/promises";
import { prisma } from "../src/prisma.js";
import { cadastroSchema } from "../src/schemas/auth.schema.js";

async function perguntar(texto: string, esconder = false) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  if (esconder) {
    // Mostra só a pergunta, não o que é digitado
    const saida = rl as unknown as { _writeToOutput: (s: string) => void };

    saida._writeToOutput = (s: string) => {
      if (s.includes(texto)) {
        process.stdout.write(texto);
      }
    };
  }

  const resposta = await rl.question(texto);
  rl.close();

  if (esconder) {
    process.stdout.write("\n");
  }

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

    console.log(`${existente.email} agora é ADMIN.`);
    return;
  }

  const senha =
    process.env.ADMIN_SENHA ?? (await perguntar("Senha (mín. 8): ", true));

  const resultado = cadastroSchema.safeParse({ email, senha, papel: "ADMIN" });

  if (!resultado.success) {
    for (const issue of resultado.error.issues) {
      console.error(`Erro em ${issue.path.join(".")}: ${issue.message}`);
    }

    process.exitCode = 1;
    return;
  }

  const usuario = await prisma.usuario.create({
    data: {
      email: resultado.data.email,
      senha: await bcrypt.hash(resultado.data.senha, 10),
      papel: "ADMIN",
    },
  });

  console.log(`ADMIN criado: ${usuario.email} (id ${usuario.id})`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
