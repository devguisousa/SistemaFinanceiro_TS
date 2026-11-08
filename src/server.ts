import { app } from "./app.js";
import { env } from "./env.js";
import { prisma } from "./prisma.js";

const servidor = app.listen(env.PORT, () => {
  console.log(`Servidor rodando na porta ${env.PORT}`);
});

// Ao desligar: para de aceitar conexões, termina as que estão abertas e fecha o banco
function desligar(sinal: string) {
  console.log(`${sinal} recebido, desligando...`);

  servidor.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  // Se travar, força a saída depois de 10 segundos
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", () => desligar("SIGTERM"));
process.on("SIGINT", () => desligar("SIGINT"));
