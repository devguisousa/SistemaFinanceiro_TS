import rateLimit from "express-rate-limit";

export const limitadorAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // Desligado nos testes automatizados
  skip: () => process.env.NODE_ENV === "test",
  message: { erro: "MUITAS TENTATIVAS. TENTE NOVAMENTE EM ALGUNS MINUTOS." },
});

export const limitadorRefresh = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { erro: "MUITAS REQUISIÇÕES. TENTE NOVAMENTE EM ALGUNS MINUTOS." },
});
