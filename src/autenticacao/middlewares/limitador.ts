import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const QUINZE_MINUTOS = 15 * 60 * 1000;

// Desligado nos testes automatizados
const desligadoEmTeste = () => process.env.NODE_ENV === "test";

const comum = {
  windowMs: QUINZE_MINUTOS,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: desligadoEmTeste,
} as const;

const ip = (req: Request) => ipKeyGenerator(req.ip ?? "");

// Login: por IP + e-mail (5 erros por conta) ...
export const limitadorLoginPorConta = rateLimit({
  ...comum,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    return `${ip(req)}:${email}`;
  },
  message: {
    erro: "MUITAS TENTATIVAS PARA ESTA CONTA. TENTE NOVAMENTE EM ALGUNS MINUTOS.",
  },
});

// ... e por IP no geral (impede testar vários e-mails do mesmo lugar)
export const limitadorLoginPorIp = rateLimit({
  ...comum,
  limit: 30,
  keyGenerator: ip,
  message: { erro: "MUITAS TENTATIVAS. TENTE NOVAMENTE EM ALGUNS MINUTOS." },
});

export const limitadorRefresh = rateLimit({
  ...comum,
  limit: 60,
  keyGenerator: ip,
  message: { erro: "MUITAS REQUISIÇÕES. TENTE NOVAMENTE EM ALGUNS MINUTOS." },
});

// Troca de senha: por usuário logado (impede adivinhar a senha atual)
export const limitadorTrocaSenha = rateLimit({
  ...comum,
  limit: 5,
  keyGenerator: (req) => `usuario:${req.usuario?.id ?? ip(req)}`,
  message: { erro: "MUITAS TENTATIVAS. TENTE NOVAMENTE EM ALGUNS MINUTOS." },
});
