import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // Tests share one MongoDB test database, so run files one at a time.
    fileParallelism: false,
    hookTimeout: 30_000,
  },
});
