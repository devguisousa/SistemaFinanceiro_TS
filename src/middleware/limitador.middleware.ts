import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const QUINZE_MINUTOS = 15 * 60 * 1000;

// Nos testes automatizados o limite fica desligado
function emTeste() {
  return process.env.NODE_ENV === "test";
}

function pegarIp(req: Request) {
  return ipKeyGenerator(req.ip ?? "");
}

// Login: 5 erros por IP + e-mail...
export const limitadorLoginPorConta = rateLimit({
  windowMs: QUINZE_MINUTOS,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: emTeste,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();

    return `${pegarIp(req)}:${email}`;
  },
  message: {
    erro: "MUITAS TENTATIVAS PARA ESTA CONTA. TENTE NOVAMENTE EM ALGUNS MINUTOS.",
  },
});

// ...e 30 por IP, para ninguém testar vários e-mails do mesmo lugar
export const limitadorLoginPorIp = rateLimit({
  windowMs: QUINZE_MINUTOS,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: emTeste,
  keyGenerator: pegarIp,
  message: { erro: "MUITAS TENTATIVAS. TENTE NOVAMENTE EM ALGUNS MINUTOS." },
});

export const limitadorRefresh = rateLimit({
  windowMs: QUINZE_MINUTOS,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: emTeste,
  keyGenerator: pegarIp,
  message: { erro: "MUITAS REQUISIÇÕES. TENTE NOVAMENTE EM ALGUNS MINUTOS." },
});

// Troca de senha: 5 por usuário logado, para não dar para adivinhar a senha atual
export const limitadorTrocaSenha = rateLimit({
  windowMs: QUINZE_MINUTOS,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: emTeste,
  keyGenerator: (req) => `usuario:${req.usuario?.id ?? pegarIp(req)}`,
  message: { erro: "MUITAS TENTATIVAS. TENTE NOVAMENTE EM ALGUNS MINUTOS." },
});
