import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./prisma.js";

const servidor = app.listen(env.PORT, () => {
  console.log(`Servidor rodando na porta ${env.PORT}`);
});

// Desligamento limpo: para de aceitar conexões, termina as atuais e fecha o banco
function desligar(sinal: string) {
  console.log(`${sinal} recebido, desligando...`);

  servidor.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  // Se algo travar, força a saída depois de 10s
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => desligar("SIGTERM"));
process.on("SIGINT", () => desligar("SIGINT"));
