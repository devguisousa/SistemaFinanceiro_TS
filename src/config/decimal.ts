import { Prisma } from "../../generated/prisma/client.js";

// Todos os Decimal do schema são dinheiro (12,2): sempre devolver "0.00"
Prisma.Decimal.prototype.toJSON = function (this: Prisma.Decimal) {
  return this.toFixed(2);
};
