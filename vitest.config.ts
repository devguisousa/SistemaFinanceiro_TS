import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // Todos os testes usam o mesmo banco: rodar um arquivo por vez
    fileParallelism: false,
  },
});
