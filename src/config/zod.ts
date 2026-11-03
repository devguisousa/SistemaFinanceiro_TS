import { z } from "zod";

// Mensagens padrão do Zod em português ("Invalid input" -> "Entrada inválida")
z.config(z.locales.pt());
