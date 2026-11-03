import type { Papel } from "../../generated/prisma/client.js";

// Usuário autenticado, preenchido pelo middleware `autenticar`
declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: number;
        papel: Papel;
      };
    }
  }
}

export {};
